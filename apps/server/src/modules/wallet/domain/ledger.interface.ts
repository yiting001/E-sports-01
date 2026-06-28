import { PayoutProvider } from '@app/contracts';
import { WithdrawalOrderEntity } from './withdrawal-order.entity';

/** 充值入账入参 */
export interface CreditRechargeInput {
  outTradeNo: string;
  providerTradeNo: string;
  paidAmountFen: number;
}

/** 提现冻结扣减入参 */
export interface ReserveWithdrawalInput {
  walletId: string;
  amountFen: number;
  provider: PayoutProvider;
  account: string;
  accountName: string;
  outBizNo: string;
}

/** 钱包账务单元（唯一余额写入口）注入令牌 */
export const WALLET_LEDGER = Symbol('WALLET_LEDGER');

/**
 * 钱包账务单元（Unit of Work）。
 * 把「余额变更 + 流水写入 + 订单状态流转」收敛到同一数据库事务内并对钱包行加锁，
 * 是全模块唯一的余额写入口，保证一致性与并发安全；上层用例只编排、不直接改余额。
 */
export interface WalletLedger {
  /**
   * 充值回调入账（幂等）。
   * 订单不存在/金额不符返回 false；订单已支付直接返回 true（重复回调安全）；
   * 首次成功：加余额、累计充值、写入账流水、置订单 paid，返回 true。
   */
  creditRecharge(input: CreditRechargeInput): Promise<boolean>;

  /**
   * 提现冻结扣减：校验余额充足后扣减、写出账流水、创建处理中提现订单。
   * 余额不足或钱包冻结时抛异常。
   */
  reserveWithdrawal(
    input: ReserveWithdrawalInput,
  ): Promise<WithdrawalOrderEntity>;

  /** 转账成功：累计提现 + 置订单 success + 回填渠道单号 */
  markWithdrawalSuccess(
    orderId: string,
    providerOrderId: string,
  ): Promise<void>;

  /** 转账失败：回滚余额、写补偿入账流水、置订单 failed */
  refundWithdrawal(orderId: string, reason: string): Promise<void>;
}
