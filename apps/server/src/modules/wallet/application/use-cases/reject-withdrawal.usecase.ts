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

/**
 * 用例：驳回提现（财务）。
 * 仅待审核工单可驳回：回滚余额（含手续费全额退回）、记补偿流水、置 rejected 并留存驳回原因。
 */
@Injectable()
export class RejectWithdrawalUseCase {
  constructor(
    @Inject(WALLET_LEDGER) private readonly ledger: WalletLedger,
    @Inject(WITHDRAWAL_ORDER_REPOSITORY)
    private readonly withdrawalRepo: WithdrawalOrderRepository,
  ) {}

  async execute(orderId: string, reason: string): Promise<WithdrawalResultView> {
    const order = await this.withdrawalRepo.findById(orderId);
    if (!order) {
      throw new NotFoundException('提现工单不存在');
    }
    if (order.status !== WithdrawalStatus.Pending) {
      throw new BadRequestException('该提现工单不是待审核状态，无法驳回');
    }
    await this.ledger.refundWithdrawal(
      order.id,
      `审核驳回：${reason}`,
      WithdrawalStatus.Rejected,
    );
    return {
      orderId: order.id,
      status: WithdrawalStatus.Rejected,
      feeFen: order.feeFen,
      arriveFen: order.amountFen - order.feeFen,
      failReason: reason,
    };
  }
}
