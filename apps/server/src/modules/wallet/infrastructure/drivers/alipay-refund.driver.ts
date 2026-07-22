import { createPrivateKey, createPublicKey } from 'node:crypto';
import { PaymentProvider, fenToYuan, yuanToFen } from '@app/contracts';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AlipayRequestError } from 'alipay-sdk';
import {
  RefundCreateInput,
  RefundExecutionResult,
  RefundExecutionStatus,
  RefundOutcomeUnknownError,
  RefundPort,
  RefundQueryInput,
} from '../../domain/refund-port.interface';
import { AlipayClientFactory } from './alipay-client.factory';

const ALIPAY_SUCCESS_CODE = '10000';
const ALIPAY_REFUND_REASON_MAX = 256;
const REFUND_FAILURE_REASON_MAX = 255;
const ALIPAY_REFUND_NOT_FOUND_CODES = new Set([
  'ACQ.TRADE_NOT_EXIST',
  'ACQ.REFUND_NOT_EXIST',
  'ACQ.REFUND_REQUEST_NOT_EXIST',
]);
const ALIPAY_DEFINITE_REFUND_FAILURE_CODES = new Set([
  'ACQ.TRADE_NOT_EXIST',
  'ACQ.REFUND_AMT_NOT_EQUAL_TOTAL',
  'ACQ.REASON_TRADE_BEEN_FREEZEN',
  'ACQ.TRADE_HAS_FINISHED',
  'ACQ.TRADE_STATUS_ERROR',
  'ACQ.DISCORDANT_REPEAT_REQUEST',
  'ACQ.REFUND_FEE_ERROR',
  'ACQ.BUYER_ERROR',
  'ACQ.SELLER_BALANCE_NOT_ENOUGH',
]);

interface AlipayRefundResponse {
  code?: string;
  msg?: string;
  subCode?: string;
  subMsg?: string;
  sub_code?: string;
  sub_msg?: string;
  outTradeNo?: string;
  outRequestNo?: string;
  refundFee?: string | number;
  refundAmount?: string | number;
}

/** 支付宝原路退款驱动（退款创建 + 退款查询）。 */
@Injectable()
export class AlipayRefundDriver implements RefundPort {
  readonly provider = PaymentProvider.Alipay;

  constructor(private readonly factory: AlipayClientFactory) {}

  async assertReady(): Promise<void> {
    const alipay = await this.factory.create();
    try {
      createPrivateKey(alipay.config.privateKey);
      createPublicKey(alipay.config.alipayPublicKey);
    } catch {
      throw new ServiceUnavailableException('支付宝退款签名或验签密钥格式无效');
    }
  }

  async createRefund(input: RefundCreateInput): Promise<RefundExecutionResult> {
    assertRefundCreateInput(input);
    const alipay = await this.factory.create();
    let response: AlipayRefundResponse;
    try {
      response = (await alipay.exec(
        'alipay.trade.refund',
        {
          bizContent: {
            out_trade_no: input.outTradeNo,
            out_request_no: input.outRefundNo,
            refund_amount: fenToYuan(input.refundAmountFen),
            refund_reason: input.reason.trim().slice(0, ALIPAY_REFUND_REASON_MAX),
          },
        },
        { validateSign: true },
      )) as unknown as AlipayRefundResponse;
    } catch (error: unknown) {
      rethrowAlipayRefundError(error);
    }

    if (response.code !== ALIPAY_SUCCESS_CODE) {
      return classifyAlipayFailure(response);
    }
    assertAlipayCreateResponse(response, input);
    // 支付宝仅返回原支付 trade_no，不把它误报成独立退款单号。
    return succeededResult();
  }

  async queryRefund(input: RefundQueryInput): Promise<RefundExecutionResult> {
    assertRefundIdentifiers(input);
    const alipay = await this.factory.create();
    let response: AlipayRefundResponse;
    try {
      response = (await alipay.exec(
        'alipay.trade.fastpay.refund.query',
        {
          bizContent: {
            out_trade_no: input.outTradeNo,
            out_request_no: input.outRefundNo,
          },
        },
        { validateSign: true },
      )) as unknown as AlipayRefundResponse;
    } catch (error: unknown) {
      rethrowAlipayRefundError(error);
    }

    if (response.code === ALIPAY_SUCCESS_CODE) {
      assertAlipayQueryResponse(response, input);
      return succeededResult();
    }
    const subCode = response.subCode ?? response.sub_code ?? '';
    if (ALIPAY_REFUND_NOT_FOUND_CODES.has(subCode)) {
      return {
        status: RefundExecutionStatus.NotFound,
        providerRefundNo: '',
        failReason: '',
      };
    }
    return classifyAlipayFailure(response);
  }
}

function rethrowAlipayRefundError(error: unknown): never {
  if (error instanceof AlipayRequestError && error.message.startsWith('验签失败')) {
    throw new BadGatewayException('支付宝退款响应验签失败');
  }
  if (error instanceof AlipayRequestError && isAlipayOutcomeUnknown(error)) {
    throw new RefundOutcomeUnknownError('支付宝退款请求传输失败，渠道结果未知');
  }
  throw error;
}

function isAlipayOutcomeUnknown(error: AlipayRequestError): boolean {
  if (/^HttpClient Request error(?::|,)/.test(error.message)) {
    return true;
  }
  const messageStatus = /^HTTP 请求错误, status: (\d{3})(?:\s|$)/.exec(error.message)?.[1];
  const status = error.responseHttpStatus ?? (messageStatus ? Number(messageStatus) : 0);
  return status === 429 || status >= 500;
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

function assertAlipayCreateResponse(
  response: AlipayRefundResponse,
  input: RefundCreateInput,
): void {
  if (
    response.outTradeNo !== input.outTradeNo ||
    parseAlipayAmountFen(response.refundFee) !== input.refundAmountFen
  ) {
    throw new BadGatewayException('支付宝退款响应订单或金额不匹配');
  }
}

function assertAlipayQueryResponse(response: AlipayRefundResponse, input: RefundQueryInput): void {
  if (
    response.outTradeNo !== input.outTradeNo ||
    response.outRequestNo !== input.outRefundNo ||
    parseAlipayAmountFen(response.refundAmount) !== input.refundAmountFen
  ) {
    throw new BadGatewayException('支付宝退款查询响应订单、退款单号或金额不匹配');
  }
}

function parseAlipayAmountFen(value: string | number | undefined): number | null {
  const text = typeof value === 'number' ? String(value) : value;
  if (!text || !/^\d+(?:\.\d{1,2})?$/.test(text)) {
    return null;
  }
  const amountFen = yuanToFen(text);
  return Number.isSafeInteger(amountFen) ? amountFen : null;
}

function formatAlipayFailure(response: AlipayRefundResponse): string {
  const code = response.subCode ?? response.sub_code ?? response.code ?? '';
  const message = response.subMsg ?? response.sub_msg ?? response.msg ?? '支付宝退款失败';
  return `${message}${code ? `（${code}）` : ''}`.slice(0, REFUND_FAILURE_REASON_MAX);
}

function classifyAlipayFailure(response: AlipayRefundResponse): RefundExecutionResult {
  const subCode = response.subCode ?? response.sub_code ?? '';
  if (!ALIPAY_DEFINITE_REFUND_FAILURE_CODES.has(subCode)) {
    throw new RefundOutcomeUnknownError('支付宝退款业务结果无法确认');
  }
  return failedResult(formatAlipayFailure(response));
}

function succeededResult(): RefundExecutionResult {
  return {
    status: RefundExecutionStatus.Succeeded,
    providerRefundNo: '',
    failReason: '',
  };
}

function failedResult(failReason: string): RefundExecutionResult {
  return {
    status: RefundExecutionStatus.Failed,
    providerRefundNo: '',
    failReason,
  };
}
