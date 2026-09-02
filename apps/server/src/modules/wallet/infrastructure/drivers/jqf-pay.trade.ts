import { BadGatewayException, BadRequestException } from '@nestjs/common';
import {
  PaymentCallbackRequest,
  PaymentCallbackResult,
  PaymentQueryResult,
  RechargeCreateInput,
} from '../../domain/payment-port.interface';
import { JqfPayConfig } from './jqf-pay.config';
import { postJqf, verifyJqfSign } from './jqf-pay.request';

/** 统一下单路径 */
const UNIFIED_ORDER_PATH = 'api/pay/unifiedOrder';
/** 查单路径 */
const QUERY_PATH = 'api/pay/query';
/** 订单状态：支付成功 */
const STATE_SUCCESS = 2;

/** 统一下单结果（payData 含义随 payDataType 而变） */
export interface JqfUnifiedOrderResult {
  payOrderId: string;
  payDataType: string;
  payData: string;
}

/**
 * 计全付统一下单（金额单位为分；wayCode/channelExtra 由具体驱动决定）。
 * returnUrl 为支付完成后的同步跳转地址，计全付会把通知参数与 returnPageAction 拼到其 querystring。
 */
export async function createJqfUnifiedOrder(
  cfg: JqfPayConfig,
  input: RechargeCreateInput,
  wayCode: string,
  channelExtra: Record<string, string>,
): Promise<JqfUnifiedOrderResult> {
  const data = await postJqf(cfg, UNIFIED_ORDER_PATH, {
    mchOrderNo: input.outTradeNo,
    wayCode,
    amount: input.amountFen,
    currency: 'CNY',
    subject: input.subject,
    body: input.subject,
    notifyUrl: input.notifyUrl || undefined,
    returnUrl: input.returnUrl || undefined,
    channelExtra: JSON.stringify(channelExtra),
  });
  const payOrderId = data.payOrderId;
  const payDataType = data.payDataType;
  const payData = data.payData;
  if (typeof payOrderId !== 'string' || typeof payDataType !== 'string') {
    throw new BadGatewayException('计全付下单响应格式异常');
  }
  return {
    payOrderId,
    payDataType,
    payData: typeof payData === 'string' ? payData : '',
  };
}

/** 主动查单：state=2 视为已支付。 */
export async function queryJqfTrade(
  cfg: JqfPayConfig,
  outTradeNo: string,
): Promise<PaymentQueryResult> {
  const data = await postJqf(cfg, QUERY_PATH, { mchOrderNo: outTradeNo });
  const state = data.state;
  const payOrderId = data.payOrderId;
  const amount = data.amount;
  if (typeof state !== 'number' || typeof payOrderId !== 'string') {
    throw new BadGatewayException('计全付查单响应格式异常');
  }
  const paid = state === STATE_SUCCESS;
  return {
    paid,
    providerTradeNo: payOrderId,
    paidAmountFen: paid && typeof amount === 'number' && Number.isSafeInteger(amount) ? amount : 0,
  };
}

/**
 * 解析计全付通知中的整数字段：异步通知以 application/x-www-form-urlencoded 送达，
 * 数值字段（state/amount）到达时为字符串，需与 JSON 数值同等接受。
 */
function readJqfInt(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

/**
 * 解析并验签计全付支付异步通知；验签失败或商户号/appId 与本地配置不一致直接拒绝。
 */
export function parseJqfCallback(
  cfg: JqfPayConfig,
  req: PaymentCallbackRequest,
): PaymentCallbackResult {
  if (!verifyJqfSign(req.body, cfg.apiKey)) {
    throw new BadRequestException('计全付回调验签失败');
  }
  if (req.body.mchNo !== cfg.mchNo || req.body.appId !== cfg.appId) {
    throw new BadRequestException('计全付回调商户号或 appId 不匹配');
  }
  const mchOrderNo = req.body.mchOrderNo;
  const payOrderId = req.body.payOrderId;
  const state = readJqfInt(req.body.state);
  const amount = readJqfInt(req.body.amount);
  if (typeof mchOrderNo !== 'string' || typeof payOrderId !== 'string' || state === null) {
    throw new BadRequestException('计全付回调参数异常');
  }
  const success = state === STATE_SUCCESS;
  const paidAmountFen = success ? amount : 0;
  if (paidAmountFen === null) {
    throw new BadRequestException('计全付回调支付金额异常');
  }
  return {
    outTradeNo: mchOrderNo,
    providerTradeNo: payOrderId,
    paidAmountFen,
    success,
  };
}

/** 计全付要求处理成功时返回纯文本 SUCCESS，否则会按梯度重试通知。 */
export function jqfCallbackAck(): string {
  return 'SUCCESS';
}
