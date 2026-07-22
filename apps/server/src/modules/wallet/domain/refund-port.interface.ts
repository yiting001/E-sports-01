import { PaymentProvider } from '@app/contracts';

/** 渠道退款执行状态；订单模块据此推进自己的审核状态机。 */
export enum RefundExecutionStatus {
  Succeeded = 'succeeded',
  Processing = 'processing',
  Failed = 'failed',
  NotFound = 'not_found',
}

/** 渠道请求已发出但无法确认结果；上层只能保留 processing 后主动查单。 */
export class RefundOutcomeUnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = RefundOutcomeUnknownError.name;
  }
}

/** 发起原路退款入参；outRefundNo 是本次渠道尝试的幂等键。 */
export interface RefundCreateInput {
  outTradeNo: string;
  outRefundNo: string;
  totalAmountFen: number;
  refundAmountFen: number;
  reason: string;
  /** 渠道异步通知地址；渠道不需要或未配置时为空串。 */
  notifyUrl: string;
}

/** 主动查询原路退款入参。 */
export interface RefundQueryInput {
  outTradeNo: string;
  outRefundNo: string;
  totalAmountFen: number;
  refundAmountFen: number;
}

/** 渠道退款统一结果，不向上层泄漏完整渠道报文。 */
export interface RefundExecutionResult {
  status: RefundExecutionStatus;
  /** 渠道退款单号；渠道未提供时为空串。 */
  providerRefundNo: string;
  /** 明确失败时的安全摘要；成功、处理中或不存在时为空串。 */
  failReason: string;
}

/** 原路退款渠道端口；余额退款不经过本端口。 */
export interface RefundPort {
  readonly provider: PaymentProvider;
  /** 仅校验本地凭证和验签材料，不发出资金请求。 */
  assertReady(): Promise<void>;
  createRefund(input: RefundCreateInput): Promise<RefundExecutionResult>;
  queryRefund(input: RefundQueryInput): Promise<RefundExecutionResult>;
}

/** 原路退款渠道集合注入令牌。 */
export const REFUND_PORTS = Symbol('REFUND_PORTS');
