import { PaymentProvider, WechatJsapiPayParams } from '@app/contracts';

/** 充值下单入参 */
export interface RechargeCreateInput {
  /** 商户订单号 */
  outTradeNo: string;
  amountFen: number;
  /** 订单标题 */
  subject: string;
  /** 异步通知回调地址 */
  notifyUrl: string;
  /** 付款人 openid（仅微信公众号 JSAPI 渠道必传，其余渠道忽略） */
  payerOpenid?: string;
}

/** 充值下单结果（扫码渠道：二维码内容；JSAPI 渠道：拉起支付参数） */
export interface RechargeCreateResult {
  /** 二维码内容（支付宝 qr_code / 微信 code_url），前端据此渲染二维码；JSAPI 渠道为空串 */
  qrCode: string;
  /** 微信公众号 JSAPI 拉起支付参数；扫码渠道不返回 */
  jsapiParams?: WechatJsapiPayParams;
}

/** 支付渠道异步回调请求（不同渠道所需材料不同，统一封装） */
export interface PaymentCallbackRequest {
  /** 已解析的请求体（支付宝表单字段；微信为解析后的 JSON 对象） */
  body: Record<string, unknown>;
  /** 原始请求体字符串（微信验签需要原文） */
  rawBody: string;
  /** 请求头（微信验签需要签名相关头） */
  headers: Record<string, string | undefined>;
}

/** 主动查单结果（调用渠道官方查询接口，回调未达时兜底确认支付结果） */
export interface PaymentQueryResult {
  /** 是否已支付成功 */
  paid: boolean;
  /** 渠道交易号（已支付时有值） */
  providerTradeNo: string;
  /** 实付金额（分，已支付时有值） */
  paidAmountFen: number;
}

/** 支付渠道回调解析结果 */
export interface PaymentCallbackResult {
  /** 商户订单号 */
  outTradeNo: string;
  /** 渠道交易号 */
  providerTradeNo: string;
  /** 实付金额（分） */
  paidAmountFen: number;
  /** 是否支付成功 */
  success: boolean;
}

/**
 * 充值（收款）渠道端口（策略模式抽象）。
 * 支付宝 / 微信等实现统一遵循该接口，运行时由配置中心 wallet.payment.provider 选择，
 * 新增渠道只需实现该接口并注册，无需改动上层用例。
 */
export interface PaymentPort {
  /** 渠道标识，与配置中心 wallet.payment.provider 取值对应 */
  readonly provider: PaymentProvider;
  /** 发起充值下单，返回可供扫码的二维码内容 */
  createRecharge(input: RechargeCreateInput): Promise<RechargeCreateResult>;
  /** 验签并解析异步回调；验签失败抛异常 */
  parseCallback(req: PaymentCallbackRequest): Promise<PaymentCallbackResult>;
  /** 主动查单（渠道官方查询接口）；单据不存在/未支付返回 paid=false，不抛异常 */
  queryTrade(outTradeNo: string): Promise<PaymentQueryResult>;
  /** 处理成功后应答给渠道的报文（支付宝为 success，微信为 JSON 串） */
  callbackAck(): string;
}

/** 充值渠道集合注入令牌（聚合所有已注册策略，供解析器按配置挑选） */
export const PAYMENT_PORTS = Symbol('PAYMENT_PORTS');
