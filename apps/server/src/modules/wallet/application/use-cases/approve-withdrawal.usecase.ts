import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WithdrawalResultView, WithdrawalStatus } from '@app/contracts';
import { WALLET_LEDGER, WalletLedger } from '../../domain/ledger.interface';
import {
  WITHDRAWAL_ORDER_REPOSITORY,
  WithdrawalOrderRepository,
} from '../../domain/withdrawal-repository.interface';
import { PayoutResolver } from '../payout.resolver';

/** 提现转账备注 */
const WITHDRAW_REMARK = '钱包提现';

/**
 * 用例：审核通过提现（财务）。
 * 待审核 → 处理中（事务内占位防并发重复转账）→ 调渠道向收款支付宝账号转账
 * 「到账金额 = 提现金额 - 手续费」；成功置 success，失败回滚余额并置 failed。
 */
@Injectable()
export class ApproveWithdrawalUseCase {
  constructor(
    private readonly payoutResolver: PayoutResolver,
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
    try {
      const port = this.payoutResolver.resolve(order.provider);
      const { providerOrderId } = await port.transfer({
        outBizNo: order.outBizNo,
        amountFen: arriveFen,
        account: order.account,
        accountName: order.accountName,
        remark: WITHDRAW_REMARK,
      });
      await this.ledger.markWithdrawalSuccess(order.id, providerOrderId);
      return {
        orderId: order.id,
        status: WithdrawalStatus.Success,
        feeFen: order.feeFen,
        arriveFen,
        failReason: null,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : '转账失败';
      await this.ledger.refundWithdrawal(
        order.id,
        reason,
        WithdrawalStatus.Failed,
      );
      return {
        orderId: order.id,
        status: WithdrawalStatus.Failed,
        feeFen: order.feeFen,
        arriveFen,
        failReason: reason,
      };
    }
  }
}
