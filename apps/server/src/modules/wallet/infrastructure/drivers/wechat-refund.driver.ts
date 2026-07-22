import { createPrivateKey, createPublicKey } from 'node:crypto';
import { PaymentProvider } from '@app/contracts';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  RefundCreateInput,
  RefundExecutionResult,
  RefundExecutionStatus,
  RefundOutcomeUnknownError,
  RefundPort,
  RefundQueryInput,
} from '../../domain/refund-port.interface';
import { WechatPayConfig, WechatPayConfigFactory } from './wechat-pay.config';
import {
  assertWechatPayResponseVerificationConfig,
  readVerifiedWechatPayResponse,
  signWechatPayRequest,
  WECHAT_PAY_API_BASE,
} from './wechat-pay.request';

const WECHAT_REFUND_PATH = '/v3/refund/domestic/refunds';
const WECHAT_REFUND_REASON_MAX = 80;
const WECHAT_REFUND_CONFLICT_CODE = 'RESOURCE_ALREADY_EXISTS';
const REFUND_FAILURE_REASON_MAX = 255;
const WECHAT_REFUND_FAILURE_TEXT: Readonly<Record<string, string>> = {
  CLOSED: '微信退款已关闭',
  ABNORMAL: '微信退款异常',
};
const WECHAT_DEFINITE_REFUND_FAILURE_CODES = new Set([
  'PARAM_ERROR',
  'INVALID_REQUEST',
  'NO_AUTH',
  'NOT_ENOUGH',
  'ORDER_NOT_EXIST',
  'ORDER_CLOSED',
  'MONEY_LIMIT',
  'REFUND_FEE_MISMATCH',
  'TRADE_OVERDUE',
]);

interface WechatRefundResponse {
  refundId: string;
  outTradeNo: string;
  outRefundNo: string;
  status: string;
  amount: {
    total: number;
    refund: number;
    currency: string;
  };
}

interface WechatErrorResponse {
  code: string;
  message: string;
}

/** 微信支付 v3 国内原路退款驱动（退款创建 + 商户退款单号查询）。 */
@Injectable()
export class WechatRefundDriver implements RefundPort {
  readonly provider = PaymentProvider.Wechat;

  constructor(private readonly configFactory: WechatPayConfigFactory) {}

  async assertReady(): Promise<void> {
    await this.loadReadyConfig();
  }

  async createRefund(input: RefundCreateInput): Promise<RefundExecutionResult> {
    assertRefundCreateInput(input);
    const config = await this.loadReadyConfig();
    const body = JSON.stringify({
      out_trade_no: input.outTradeNo,
      out_refund_no: input.outRefundNo,
      ...(input.reason.trim()
        ? { reason: input.reason.trim().slice(0, WECHAT_REFUND_REASON_MAX) }
        : {}),
      ...(input.notifyUrl ? { notify_url: input.notifyUrl } : {}),
      amount: {
        refund: input.refundAmountFen,
        total: input.totalAmountFen,
        currency: 'CNY',
      },
    });
    const response = await this.request(config, 'POST', WECHAT_REFUND_PATH, body);
    const responseBody = await readVerifiedWechatPayResponse(config, response);
    if (!response.ok) {
      const error = parseWechatError(responseBody);
      if (response.status === 409 || error.code === WECHAT_REFUND_CONFLICT_CODE) {
        return this.queryRefund({
          outTradeNo: input.outTradeNo,
          outRefundNo: input.outRefundNo,
          totalAmountFen: input.totalAmountFen,
          refundAmountFen: input.refundAmountFen,
        });
      }
      if (response.status >= 500 || response.status === 429) {
        throw new RefundOutcomeUnknownError('微信退款服务暂不可用，渠道结果未知');
      }
      return classifyWechatFailure(error);
    }
    return mapWechatRefund(parseWechatRefund(responseBody), input);
  }

  async queryRefund(input: RefundQueryInput): Promise<RefundExecutionResult> {
    assertRefundIdentifiers(input);
    const config = await this.loadReadyConfig();
    const path = `${WECHAT_REFUND_PATH}/${encodeURIComponent(input.outRefundNo)}`;
    const response = await this.request(config, 'GET', path, '');
    const responseBody = await readVerifiedWechatPayResponse(config, response);
    if (response.status === 404) {
      return {
        status: RefundExecutionStatus.NotFound,
        providerRefundNo: '',
        failReason: '',
      };
    }
    if (!response.ok) {
      if (response.status >= 500 || response.status === 429) {
        throw new RefundOutcomeUnknownError('微信退款服务暂不可用，渠道结果未知');
      }
      return classifyWechatFailure(parseWechatError(responseBody));
    }
    return mapWechatRefund(parseWechatRefund(responseBody), input);
  }

  private async loadReadyConfig(): Promise<WechatPayConfig> {
    const config = await this.configFactory.load();
    assertWechatPayRefundConfig(config);
    return config;
  }

  private async request(
    config: WechatPayConfig,
    method: 'GET' | 'POST',
    path: string,
    body: string,
  ): Promise<Response> {
    assertWechatPayResponseVerificationConfig(config);
    const authorization = signWechatPayRequest(config, method, path, body);
    try {
      return await fetch(`${WECHAT_PAY_API_BASE}${path}`, {
        method,
        headers: {
          Authorization: authorization,
          Accept: 'application/json',
          ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(method === 'POST' ? { body } : {}),
      });
    } catch {
      throw new RefundOutcomeUnknownError('微信退款请求传输失败，渠道结果未知');
    }
  }
}

function assertRefundCreateInput(input: RefundCreateInput): void {
  assertRefundIdentifiers(input);
  if (
    !Number.isSafeInteger(input.totalAmountFen) ||
    !Number.isSafeInteger(input.refundAmountFen) ||
    input.totalAmountFen <= 0 ||
    input.refundAmountFen <= 0 ||
    input.refundAmountFen > input.totalAmountFen
  ) {
    throw new BadRequestException('退款金额不合法');
  }
}

function assertRefundIdentifiers(input: RefundQueryInput): void {
  if (!input.outTradeNo.trim() || !input.outRefundNo.trim()) {
    throw new BadRequestException('退款单号不合法');
  }
  if (
    !Number.isSafeInteger(input.totalAmountFen) ||
    !Number.isSafeInteger(input.refundAmountFen) ||
    input.totalAmountFen <= 0 ||
    input.refundAmountFen <= 0 ||
    input.refundAmountFen > input.totalAmountFen
  ) {
    throw new BadRequestException('退款金额不合法');
  }
}

function assertWechatPayRefundConfig(config: WechatPayConfig): void {
  assertWechatPayResponseVerificationConfig(config);
  try {
    createPrivateKey(config.privateKey);
    createPublicKey(config.platformPublicKey);
  } catch {
    throw new ServiceUnavailableException('微信支付退款签名或验签密钥格式无效');
  }
}

function parseWechatRefund(body: string): WechatRefundResponse {
  const value = parseJson(body);
  if (!isRecord(value)) {
    throw new BadGatewayException('微信退款响应格式异常');
  }
  const refundId = value.refund_id;
  const outTradeNo = value.out_trade_no;
  const outRefundNo = value.out_refund_no;
  const status = value.status;
  const amount = value.amount;
  const total = isRecord(amount) ? amount.total : undefined;
  const refund = isRecord(amount) ? amount.refund : undefined;
  const currency = isRecord(amount) ? amount.currency : undefined;
  if (
    typeof refundId !== 'string' ||
    typeof outTradeNo !== 'string' ||
    typeof outRefundNo !== 'string' ||
    typeof status !== 'string' ||
    typeof total !== 'number' ||
    !Number.isSafeInteger(total) ||
    typeof refund !== 'number' ||
    !Number.isSafeInteger(refund) ||
    typeof currency !== 'string'
  ) {
    throw new BadGatewayException('微信退款响应格式异常');
  }
  return {
    refundId,
    outTradeNo,
    outRefundNo,
    status,
    amount: {
      total,
      refund,
      currency,
    },
  };
}

function parseWechatError(body: string): WechatErrorResponse {
  const value = parseJson(body);
  if (!isRecord(value)) {
    return { code: '', message: '微信退款失败' };
  }
  return {
    code: typeof value.code === 'string' ? value.code : '',
    message: typeof value.message === 'string' ? value.message : '微信退款失败',
  };
}

function parseJson(text: string): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapWechatRefund(
  response: WechatRefundResponse,
  expected: RefundQueryInput,
): RefundExecutionResult {
  if (
    response.outTradeNo !== expected.outTradeNo ||
    response.outRefundNo !== expected.outRefundNo ||
    response.amount.total !== expected.totalAmountFen ||
    response.amount.refund !== expected.refundAmountFen ||
    response.amount.currency !== 'CNY'
  ) {
    throw new BadGatewayException('微信退款响应订单、退款单号或金额不匹配');
  }
  if (response.status === 'SUCCESS') {
    return {
      status: RefundExecutionStatus.Succeeded,
      providerRefundNo: response.refundId,
      failReason: '',
    };
  }
  if (response.status === 'PROCESSING') {
    return {
      status: RefundExecutionStatus.Processing,
      providerRefundNo: response.refundId,
      failReason: '',
    };
  }
  const failReason = WECHAT_REFUND_FAILURE_TEXT[response.status];
  if (!failReason) {
    throw new RefundOutcomeUnknownError('微信退款状态无法确认');
  }
  return failedResult(failReason, response.refundId);
}

function formatWechatFailure(error: WechatErrorResponse): string {
  return `${error.message}${error.code ? `（${error.code}）` : ''}`.slice(
    0,
    REFUND_FAILURE_REASON_MAX,
  );
}

function classifyWechatFailure(error: WechatErrorResponse): RefundExecutionResult {
  if (!WECHAT_DEFINITE_REFUND_FAILURE_CODES.has(error.code)) {
    throw new RefundOutcomeUnknownError('微信退款业务结果无法确认');
  }
  return failedResult(formatWechatFailure(error));
}

function failedResult(failReason: string, providerRefundNo = ''): RefundExecutionResult {
  return {
    status: RefundExecutionStatus.Failed,
    providerRefundNo,
    failReason,
  };
}
