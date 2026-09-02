import { Inject, Injectable } from '@nestjs/common';
import { WithdrawalStatus } from '@app/contracts';
import {
  WALLET_LEDGER,
  WalletLedger,
  WithdrawalChannelMeta,
} from '../domain/ledger.interface';
import {
  PayoutExecutionStatus,
  PayoutResult,
} from '../domain/payout-port.interface';

/** 渠道未回传失败原因时的兜底文案 */
const DEFAULT_FAIL_REASON = '渠道转账失败';

/** 渠道执行结果 → 提现单渠道快照 */
export function toWithdrawalChannelMeta(
  result: PayoutResult,
): WithdrawalChannelMeta {
  return {
    providerOrderId: result.providerOrderId || null,
    channelOrderNo: result.channelOrderNo,
    channelState: result.channelState,
    channelErrCode: result.channelErrCode,
    channelErrMsg: result.channelErrMsg,
    channelFeeFen: result.channelFeeFen,
  };
}

/**
 * 提现单渠道状态收敛（审核发起 / 异步通知 / 主动查单三条路径共用）。
 * 把统一的渠道执行结果推进为提现单状态：
 * 成功 → 账本记成功（幂等）；处理中 → 只刷新渠道快照；明确失败/关闭 → 回滚余额并置 failed。
 * 「渠道无此单」不在此处理，由调用方按各自语义决定（发起阶段不可能出现，查单阶段需结合宽限期）。
 */
@Injectable()
export class WithdrawalSettlementService {
  constructor(@Inject(WALLET_LEDGER) private readonly ledger: WalletLedger) {}

  async apply(
    orderId: string,
    result: PayoutResult,
  ): Promise<WithdrawalStatus> {
    const meta = toWithdrawalChannelMeta(result);
    switch (result.status) {
      case PayoutExecutionStatus.Succeeded:
        await this.ledger.markWithdrawalSuccess(orderId, meta);
        return WithdrawalStatus.Success;
      case PayoutExecutionStatus.Failed:
        await this.ledger.refundWithdrawal(
          orderId,
          result.failReason || DEFAULT_FAIL_REASON,
          WithdrawalStatus.Failed,
          meta,
        );
        return WithdrawalStatus.Failed;
      default:
        await this.ledger.syncWithdrawalChannel(orderId, meta);
        return WithdrawalStatus.Processing;
    }
  }

  /** 明确失败（渠道拒绝/无此单等）：回滚余额并置 failed，可附带渠道快照。 */
  async fail(
    orderId: string,
    reason: string,
    result?: PayoutResult,
  ): Promise<WithdrawalStatus> {
    await this.ledger.refundWithdrawal(
      orderId,
      reason,
      WithdrawalStatus.Failed,
      result ? toWithdrawalChannelMeta(result) : undefined,
    );
    return WithdrawalStatus.Failed;
  }
}
