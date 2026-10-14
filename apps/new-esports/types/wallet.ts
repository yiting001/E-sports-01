/**
 * 钱包契约的最小镜像（单一来源：packages/contracts/src/wallet/wallet.ts）。
 * 金额一律以「分」为单位的整数传输，展示用元字符串由 fenToYuan 统一换算。
 */

/** 万分比基数（折扣/费率专用，10000 = 100%） */
export const FEE_RATE_BASE = 10000;

/** 资金方向 */
export enum FundDirection {
  /** 入账（余额增加） */
  In = 'in',
  /** 出账（余额减少） */
  Out = 'out',
}

/** 钱包流水类型 */
export enum WalletTxnType {
  Recharge = 'recharge',
  Withdraw = 'withdraw',
  /** 服务订单余额支付出账 */
  OrderPayment = 'order_payment',
  /** 服务订单退款入账 */
  OrderRefund = 'order_refund',
  /** 平台调整（人工增减） */
  Adjust = 'adjust',
  /** 订单提成入账 */
  Commission = 'commission',
  /** 打手押金缴纳 */
  Deposit = 'deposit',
  /** 打手押金退还 */
  DepositRefund = 'deposit_refund',
  /** 罚款扣除 */
  Penalty = 'penalty',
  /** 邀请奖励入账 */
  InviteReward = 'invite_reward',
}

/** 钱包视图（仅消费余额字段） */
export interface WalletView {
  id: string;
  balanceFen: number;
  /** 余额元字符串（服务端已格式化） */
  balanceYuan: string;
}

/** 钱包流水（明细）视图 */
export interface WalletTransactionView {
  id: string;
  type: WalletTxnType;
  direction: FundDirection;
  amountFen: number;
  amountYuan: string;
  /** 变更后余额（分） */
  balanceAfterFen: number;
  balanceAfterYuan: string;
  remark: string;
  createdAt: string;
}
