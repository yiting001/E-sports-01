import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CONFIG_KEYS,
  WithdrawalResultView,
  WithdrawalStatus,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { WALLET_LEDGER, WalletLedger } from '../../domain/ledger.interface';
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

/** 提现转账备注 */
const WITHDRAW_REMARK = '钱包提现';

/** 提现单实际执行渠道对应的异步通知地址（渠道支持通知时才下发） */
export function buildPayoutNotifyUrl(
  notifyBaseUrl: string,
  order: WithdrawalOrderEntity,
): string {
  return notifyBaseUrl
    ? `${notifyBaseUrl}/wallet/withdrawal/callback/${order.provider}`
    : '';
}

/**
 * 用例：审核通过提现（财务）。
 * 待审核 → 处理中（事务内占位防并发重复转账）→ 按提现单持久化的执行渠道发起转账，
 * 「到账金额 = 提现金额 - 手续费」。渠道同步成功直接置 success；渠道受理/转账中保持
 * processing，等待异步通知或主动查单收敛；渠道明确拒绝才回滚余额置 failed；
 * 请求已发出但结果未知（网关不可达/响应异常）同样保持 processing，绝不回滚。
 */
@Injectable()
export class ApproveWithdrawalUseCase {
  constructor(
    private readonly payoutResolver: PayoutResolver,
    private readonly settlement: WithdrawalSettlementService,
    private readonly config: ConfigService,
    @Inject(WALLET_LEDGER) private readonly ledger: WalletLedger,
    @Inject(WITHDRAWAL_ORDER_REPOSITORY)
    private readonly withdrawalRepo: WithdrawalOrderRepository,
  ) {}

  async execute(orderId: string): Promise<WithdrawalResultView> {
    const exists = await this.withdrawalRepo.findById(orderId);
    if (!exists) {
      throw new NotFoundException('提现工单不存在');
    }
    const order = await this.ledger.beginWithdrawalTransfer(orderId);
    if (!order) {
      throw new BadRequestException('该提现工单不是待审核状态，无法审核');
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

    let result: PayoutResult;
    try {
      const port = this.payoutResolver.resolve(order.provider);
      const notifyBaseUrl = await this.config.getString(
        CONFIG_KEYS.wallet.notifyBaseUrl,
        '',
      );
      result = await port.transfer({
        outBizNo: order.outBizNo,
        amountFen: arriveFen,
        account: order.account,
        accountName: order.accountName,
        idCardNo: order.idCardNo,
        bankName: order.bankName,
        phone: order.phone,
        remark: WITHDRAW_REMARK,
        notifyUrl: port.supportsCallback
          ? buildPayoutNotifyUrl(notifyBaseUrl, order)
          : '',
      });
    } catch (error) {
      if (error instanceof PayoutOutcomeUnknownError) {
        await this.ledger.syncWithdrawalChannel(order.id, {});
        return view(WithdrawalStatus.Processing, error.message);
      }
      // 渠道未注册/未配置/未开通等在请求发出前即失败，资金未出，可安全回滚
      const reason = error instanceof Error ? error.message : '转账失败';
      const status = await this.settlement.fail(order.id, reason);
      return view(status, reason);
    }
    if (result.status === PayoutExecutionStatus.NotFound) {
      const reason = '渠道未受理该转账单';
      return view(await this.settlement.fail(order.id, reason, result), reason);
    }
    const status = await this.settlement.apply(order.id, result);
    return view(
      status,
      status === WithdrawalStatus.Failed ? result.failReason || '转账失败' : null,
    );
  }
}
