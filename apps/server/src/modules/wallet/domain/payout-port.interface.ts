import { PayoutProvider } from '@app/contracts';

/** 转账付款入参 */
export interface PayoutInput {
  /** 商户提现单号 */
  outBizNo: string;
  amountFen: number;
  /** 收款方账号（支付宝登录号：邮箱/手机号） */
  account: string;
  /** 收款方真实姓名 */
  accountName: string;
  /** 转账备注 */
  remark: string;
}

/** 转账付款结果 */
export interface PayoutResult {
  /** 渠道转账单号 */
  providerOrderId: string;
}

/**
 * 提现（付款）渠道端口（策略模式抽象）。
 * 支付宝转账为正式实现，微信为预留位（调用即抛“未开通”）；
 * 运行时由配置中心 wallet.payout.provider 选择。
 */
export interface PayoutPort {
  /** 渠道标识，与配置中心 wallet.payout.provider 取值对应 */
  readonly provider: PayoutProvider;
  /** 是否已开通（预留渠道为 false，用例据此在扣款前拦截，避免无谓的冻结/回滚） */
  readonly available: boolean;
  /** 发起转账付款；失败抛异常（由用例捕获并回滚余额） */
  transfer(input: PayoutInput): Promise<PayoutResult>;
}

/** 提现渠道集合注入令牌 */
export const PAYOUT_PORTS = Symbol('PAYOUT_PORTS');
