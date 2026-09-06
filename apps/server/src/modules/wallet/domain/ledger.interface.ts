import {
  FundDirection,
  PayoutChannelState,
  PayoutProvider,
  WalletTxnType,
  WithdrawalStatus,
} from '@app/contracts';
import { WalletEntity } from './wallet.entity';
import { WithdrawalOrderEntity } from './withdrawal-order.entity';

/** 充值入账入参 */
export interface CreditRechargeInput {
  outTradeNo: string;
  providerTradeNo: string;
  paidAmountFen: number;
  /** 渠道手续费（分），渠道未回传时为空 */
  channelFeeFen?: number | null;
}

/** 提现单渠道侧快照（发起/通知/查单后回填） */
export interface WithdrawalChannelMeta {
  providerOrderId: string | null;
  channelOrderNo: string | null;
  channelState: PayoutChannelState | null;
  channelErrCode: string | null;
  channelErrMsg: string | null;
  channelFeeFen: number | null;
}

/** 提现冻结扣减入参 */
export interface ReserveWithdrawalInput {
  walletId: string;
  amountFen: number;
  /** 手续费（分），申请时按配置费率计算 */
  feeFen: number;
  provider: PayoutProvider;
  account: string;
  accountName: string;
  /** 收款方身份证号（报税用） */
  idCardNo: string;
  /** 开户行名称（银行卡提现） */
  bankName: string | null;
  /** 银行预留手机号（银行卡提现且渠道要求时） */
  phone: string | null;
  outBizNo: string;
}

/** 余额直调入参（管理端人工调整 / 提成入账 / 押金缴退 / 罚款扣除共用） */
export interface AdjustBalanceInput {
  walletId: string;
  /** 入账增加余额 / 出账扣减余额 */
  direction: FundDirection;
  /** 调整金额（分，正整数） */
  amountFen: number;
  /** 调整备注（审计追溯用） */
  remark: string;
  /** 流水类型，缺省为 adjust（人工调整） */
  type?: WalletTxnType;
  /** 关联业务单 id（如提成对应的服务订单） */
  bizOrderId?: string | null;
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
   * 提现冻结扣减：校验余额充足后扣减、写出账流水、创建待审核提现订单。
   * 余额不足或钱包冻结时抛异常。
   */
  reserveWithdrawal(
    input: ReserveWithdrawalInput,
  ): Promise<WithdrawalOrderEntity>;

  /**
   * 审核通过：待审核 → 处理中（占位防重复发起转账）。
   * 订单不存在或非待审核状态返回 null。
   */
  beginWithdrawalTransfer(
    orderId: string,
  ): Promise<WithdrawalOrderEntity | null>;

  /**
   * 转账成功（幂等）：仅 processing 单累计提现 + 置 success + 回填渠道快照，返回 true；
   * 已是终态或订单不存在返回 false（重复通知安全）。
   */
  markWithdrawalSuccess(
    orderId: string,
    meta: WithdrawalChannelMeta,
  ): Promise<boolean>;

  /** 渠道仍在处理中：仅刷新 processing 单的渠道快照与同步时间，不动余额与状态。 */
  syncWithdrawalChannel(
    orderId: string,
    meta: Partial<WithdrawalChannelMeta>,
  ): Promise<void>;

  /**
   * 提现回滚（幂等）：仅 pending/processing 单回滚余额、写补偿入账流水，按场景置终态
   * （转账失败 → failed；审核驳回 → rejected），可同时回填渠道快照；返回是否发生回滚。
   */
  refundWithdrawal(
    orderId: string,
    reason: string,
    toStatus: WithdrawalStatus.Failed | WithdrawalStatus.Rejected,
    meta?: Partial<WithdrawalChannelMeta>,
  ): Promise<boolean>;

  /**
   * 管理端人工调整余额（增加/扣减），写入一条 adjust 流水。
   * 出账方向余额不足时抛异常；钱包不存在时抛异常。返回调整后的钱包。
   */
  adjustBalance(input: AdjustBalanceInput): Promise<WalletEntity>;
}
