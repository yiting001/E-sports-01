import { PayoutChannelState, PayoutProvider } from '@app/contracts';

/** 转账付款入参 */
export interface PayoutInput {
  /** 商户提现单号（渠道幂等键，重复发起同一单号不会二次出款） */
  outBizNo: string;
  amountFen: number;
  /** 收款方账号（支付宝登录号：邮箱/手机号；微信零钱：服务端绑定的 openid；银行卡：卡号） */
  account: string;
  /** 收款方真实姓名 */
  accountName: string;
  /** 收款方身份证号（银行卡转账部分渠道要求；历史单据为 null） */
  idCardNo: string | null;
  /** 开户行名称（银行卡转账） */
  bankName: string | null;
  /** 银行预留手机号（银行卡转账部分渠道要求） */
  phone: string | null;
  /** 转账备注 */
  remark: string;
  /** 渠道异步通知地址；渠道不支持通知或未配置时为空串 */
  notifyUrl: string;
}

/** 主动查询转账入参 */
export interface PayoutQueryInput {
  outBizNo: string;
  /** 已知的渠道转账单号（可为空，驱动优先按商户单号查询） */
  providerOrderId: string | null;
}

/** 渠道转账执行状态；提现状态机据此推进。 */
export enum PayoutExecutionStatus {
  /** 渠道已确认出款成功 */
  Succeeded = 'succeeded',
  /** 渠道已受理、结果待异步通知或主动查单确认 */
  Processing = 'processing',
  /** 渠道明确失败/关单，资金未出 */
  Failed = 'failed',
  /** 渠道不存在该转账单（从未受理成功） */
  NotFound = 'not_found',
}

/** 渠道请求已发出但无法确认结果（网关不可达/响应异常）；上层只能保持处理中后查单。 */
export class PayoutOutcomeUnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = PayoutOutcomeUnknownError.name;
  }
}

/** 渠道转账统一结果（不向上层泄漏完整渠道报文） */
export interface PayoutResult {
  status: PayoutExecutionStatus;
  /** 渠道转账单号（计全付 transferId / 支付宝 order_id）；渠道未提供时为空串 */
  providerOrderId: string;
  /** 最终资金渠道（微信/支付宝）的转账单号；聚合网关回填，官方直连为 null */
  channelOrderNo: string | null;
  /** 渠道侧归一状态；无法映射时为 null */
  channelState: PayoutChannelState | null;
  /** 渠道错误码 / 错误描述（失败时回填） */
  channelErrCode: string | null;
  channelErrMsg: string | null;
  /** 渠道向平台收取的手续费（分，含技术服务费）；渠道未返回为 null */
  channelFeeFen: number | null;
  /** 明确失败时的安全摘要；其余为空串 */
  failReason: string;
}

/** 转账异步通知请求（表单/JSON 已解析为对象，附原文与请求头供验签） */
export interface PayoutCallbackRequest {
  body: Record<string, unknown>;
  rawBody: string;
  headers: Record<string, string | undefined>;
}

/** 转账异步通知解析结果 */
export interface PayoutCallbackResult extends PayoutResult {
  /** 商户提现单号 */
  outBizNo: string;
  /** 通知中的转账金额（分），用于与本地到账金额核对 */
  amountFen: number;
}

/**
 * 提现（付款）渠道端口（策略模式抽象）。
 * 支付宝官方转账为同步结果渠道；计全付转账为异步渠道（受理后由通知/查单确认）；
 * 微信官方为预留位。运行时由用户选择的渠道经 PaymentGatewayService 映射后解析。
 */
export interface PayoutPort {
  /** 渠道标识，持久化到提现单 */
  readonly provider: PayoutProvider;
  /** 是否已开通（预留渠道为 false，用例据此在扣款前拦截，避免无谓的冻结/回滚） */
  readonly available: boolean;
  /** 是否有异步通知（决定是否需要注册回调路由与传 notifyUrl） */
  readonly supportsCallback: boolean;
  /**
   * 发起转账付款。渠道明确拒绝返回 Failed/NotFound；受理中返回 Processing；
   * 请求发出后结果无法确认抛 PayoutOutcomeUnknownError（上层保持处理中，不回滚余额）。
   */
  transfer(input: PayoutInput): Promise<PayoutResult>;
  /** 主动查询转账结果；渠道不存在该单返回 NotFound，查询本身失败抛 PayoutOutcomeUnknownError */
  queryTransfer(input: PayoutQueryInput): Promise<PayoutResult>;
  /** 验签并解析转账异步通知；验签失败或商户身份不符抛异常 */
  parseCallback(req: PayoutCallbackRequest): Promise<PayoutCallbackResult>;
  /** 处理成功后应答给渠道的报文 */
  callbackAck(): string;
}

/** 提现渠道集合注入令牌 */
export const PAYOUT_PORTS = Symbol('PAYOUT_PORTS');
