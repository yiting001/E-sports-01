import { BadGatewayException, Injectable } from '@nestjs/common';
import { PaymentProvider } from '@app/contracts';
import {
  RefundCreateInput,
  RefundExecutionResult,
  RefundExecutionStatus,
  RefundOutcomeUnknownError,
  RefundPort,
  RefundQueryInput,
} from '../../domain/refund-port.interface';
import { JqfPayConfig, JqfPayConfigFactory } from './jqf-pay.config';
import { postJqf } from './jqf-pay.request';

/** 发起退款路径 */
const REFUND_PATH = 'api/refund/refundOrder';
/** 查询退款路径 */
const REFUND_QUERY_PATH = 'api/refund/query';
/** 退款状态：0 生成 / 1 退款中 / 2 成功 / 3 失败 */
const REFUND_STATE_SUCCESS = 2;
const REFUND_STATE_FAILED = 3;
/** 退款单不存在的业务提示（计全付以 msg 文本表达） */
const REFUND_NOT_FOUND_TEXTS = ['退款订单不存在', '原订单不存在'];

/**
 * 计全付原路退款驱动（微信 Native 与 JSAPI 共用商户号，统一走本驱动）。
 * 计全付退款接口不区分支付方式（按 mchOrderNo 原路退回），支付宝变体仅改变 provider 标识。
 * 幂等键为 mchRefundNo；请求传输失败或状态无法确认时抛 RefundOutcomeUnknownError，
 * 由上层保留处理中状态后主动查询。
 */
@Injectable()
export class JqfRefundDriver implements RefundPort {
  readonly provider: PaymentProvider = PaymentProvider.JqfWechat;

  constructor(private readonly configFactory: JqfPayConfigFactory) {}

  async assertReady(): Promise<void> {
    await this.configFactory.load();
  }

  async createRefund(input: RefundCreateInput): Promise<RefundExecutionResult> {
    const cfg = await this.configFactory.load();
    let data: Record<string, unknown>;
    try {
      data = await postJqf(cfg, REFUND_PATH, {
        mchOrderNo: input.outTradeNo,
        mchRefundNo: input.outRefundNo,
        refundAmount: input.refundAmountFen,
        currency: 'CNY',
        refundReason: input.reason || '订单退款',
        notifyUrl: input.notifyUrl || undefined,
      });
    } catch (error) {
      return this.classifyRequestFailure(cfg, input, error);
    }
    return mapJqfRefund(data);
  }

  async queryRefund(input: RefundQueryInput): Promise<RefundExecutionResult> {
    const cfg = await this.configFactory.load();
    let data: Record<string, unknown>;
    try {
      data = await postJqf(cfg, REFUND_QUERY_PATH, { mchRefundNo: input.outRefundNo });
    } catch (error) {
      if (isNotFoundFailure(error)) {
        return {
          status: RefundExecutionStatus.NotFound,
          providerRefundNo: '',
          failReason: '',
        };
      }
      throw new RefundOutcomeUnknownError('计全付退款状态查询失败，渠道结果未知');
    }
    return mapJqfRefund(data);
  }

  /**
   * 下单失败分类：网关不可达结果未知；业务报错先查一次退款单，
   * 已存在则以查询结果为准（重复提交幂等），确实不存在才判定失败。
   */
  private async classifyRequestFailure(
    cfg: JqfPayConfig,
    input: RefundCreateInput,
    error: unknown,
  ): Promise<RefundExecutionResult> {
    if (error instanceof BadGatewayException) {
      throw new RefundOutcomeUnknownError('计全付退款服务暂不可用，渠道结果未知');
    }
    try {
      const data = await postJqf(cfg, REFUND_QUERY_PATH, { mchRefundNo: input.outRefundNo });
      return mapJqfRefund(data);
    } catch (queryError) {
      if (isNotFoundFailure(queryError)) {
        return {
          status: RefundExecutionStatus.Failed,
          providerRefundNo: '',
          failReason: error instanceof Error ? error.message.slice(0, 255) : '计全付退款失败',
        };
      }
      throw new RefundOutcomeUnknownError('计全付退款业务结果无法确认');
    }
  }
}

/** 计全付支付宝二维码支付的原路退款（与微信共用商户号与退款接口）。 */
@Injectable()
export class JqfAlipayRefundDriver extends JqfRefundDriver {
  override readonly provider: PaymentProvider = PaymentProvider.JqfAlipay;
}

/** 判断错误是否为「退款单不存在」类业务失败。 */
function isNotFoundFailure(error: unknown): boolean {
  return (
    error instanceof Error && REFUND_NOT_FOUND_TEXTS.some((text) => error.message.includes(text))
  );
}

/** 计全付退款响应/查询结果映射为统一执行结果。 */
function mapJqfRefund(data: Record<string, unknown>): RefundExecutionResult {
  const state = data.state;
  const refundOrderId = data.refundOrderId;
  if (typeof state !== 'number' || typeof refundOrderId !== 'string') {
    throw new RefundOutcomeUnknownError('计全付退款响应格式异常，渠道结果未知');
  }
  if (state === REFUND_STATE_SUCCESS) {
    return {
      status: RefundExecutionStatus.Succeeded,
      providerRefundNo: refundOrderId,
      failReason: '',
    };
  }
  if (state === REFUND_STATE_FAILED) {
    const errMsg = data.errMsg;
    return {
      status: RefundExecutionStatus.Failed,
      providerRefundNo: refundOrderId,
      failReason: typeof errMsg === 'string' && errMsg ? errMsg.slice(0, 255) : '计全付退款失败',
    };
  }
  return {
    status: RefundExecutionStatus.Processing,
    providerRefundNo: refundOrderId,
    failReason: '',
  };
}
