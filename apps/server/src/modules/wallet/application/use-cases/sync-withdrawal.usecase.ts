import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WithdrawalResultView, WithdrawalStatus } from '@app/contracts';
import {
  PayoutExecutionStatus,
  PayoutOutcomeUnknownError,
  PayoutResult,
} from '../../domain/payout-port.interface';
import { WithdrawalOrderEntity } from '../../domain/withdrawal-order.entity';
import {
  WITHDRAWAL_ORDER_REPOSITORY,
  WithdrawalOrderRepository,
} from '../../domain/withdrawal-repository.interface';
import { PayoutResolver } from '../payout.resolver';
import { WithdrawalSettlementService } from '../withdrawal-settlement.service';

/** 渠道「无此单」判定为未受理前的宽限期（毫秒）：覆盖发起请求与渠道落库之间的时间差 */
export const PAYOUT_NOT_FOUND_GRACE_MS = 5 * 60 * 1000;

/** 渠道无此单且已过宽限期、渠道从未受理（无渠道单号）→ 可判定资金未出 */
export function canFailOnNotFound(
  order: WithdrawalOrderEntity,
  now: Date,
): boolean {
  return (
    !order.providerOrderId &&
    now.getTime() - order.updatedAt.getTime() >= PAYOUT_NOT_FOUND_GRACE_MS
  );
}

/**
 * 用例：主动向渠道查询处理中提现单的转账结果并推进状态（财务手动同步 / 通知丢失兜底）。
 * 成功 → success；失败/关闭 → 回滚余额置 failed；转账中 → 刷新渠道快照；
 * 查询结果未知 → 保持 processing 不回滚；渠道无此单 → 仅在渠道从未受理且超过宽限期时
 * 判定为未出款回滚，否则保持 processing 等待下次同步。
 */
@Injectable()
export class SyncWithdrawalUseCase {
  private readonly logger = new Logger(SyncWithdrawalUseCase.name);

  constructor(
    private readonly payoutResolver: PayoutResolver,
    private readonly settlement: WithdrawalSettlementService,
    @Inject(WITHDRAWAL_ORDER_REPOSITORY)
    private readonly withdrawalRepo: WithdrawalOrderRepository,
  ) {}

  async execute(orderId: string): Promise<WithdrawalResultView> {
    const order = await this.withdrawalRepo.findById(orderId);
    if (!order) {
      throw new NotFoundException('提现工单不存在');
    }
    if (order.status !== WithdrawalStatus.Processing) {
      throw new BadRequestException('仅处理中的提现工单需要同步渠道状态');
    }
    const arriveFen = order.amountFen - order.feeFen;
    const view = (
      status: WithdrawalStatus,
      failReason: string | null,
    ): WithdrawalResultView => ({
      orderId: order.id,
      status,
      feeFen: order.feeFen,
      arriveFen,
      failReason,
    });

    const port = this.payoutResolver.resolve(order.provider);
    let result: PayoutResult;
    try {
      result = await port.queryTransfer({
        outBizNo: order.outBizNo,
        providerOrderId: order.providerOrderId,
      });
    } catch (error) {
      if (error instanceof PayoutOutcomeUnknownError) {
        return view(WithdrawalStatus.Processing, error.message);
      }
      throw error;
    }
    if (result.status === PayoutExecutionStatus.NotFound) {
      if (canFailOnNotFound(order, new Date())) {
        const reason = '渠道无此转账单，判定为未出款';
        return view(await this.settlement.fail(order.id, reason, result), reason);
      }
      this.logger.warn(
        `渠道暂无提现单 outBizNo=${order.outBizNo} providerOrderId=${order.providerOrderId ?? ''}`,
      );
      return view(WithdrawalStatus.Processing, '渠道暂未查到该转账单，请稍后再同步');
    }
    const status = await this.settlement.apply(order.id, result);
    return view(
      status,
      status === WithdrawalStatus.Failed ? result.failReason || '转账失败' : null,
    );
  }
}
