import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProvider, WechatJsapiPayParams } from '@app/contracts';
import {
  PaymentCallbackRequest,
  PaymentCallbackResult,
  PaymentPort,
  PaymentQueryResult,
  RechargeCreateInput,
  RechargeCreateResult,
} from '../../domain/payment-port.interface';
import { JqfPayConfigFactory } from './jqf-pay.config';
import {
  createJqfUnifiedOrder,
  jqfCallbackAck,
  parseJqfCallback,
  queryJqfTrade,
} from './jqf-pay.trade';

/**
 * 计全付「微信公众号 JSAPI 支付」驱动（wayCode=WX_JSAPI）。
 * channelExtra 传付款人 openid，payDataType=wxapp 时 payData 为
 * WeixinJSBridge 拉起参数 JSON（appId/timeStamp/nonceStr/package/signType/paySign）。
 */
@Injectable()
export class JqfWechatJsapiPaymentDriver implements PaymentPort {
  readonly provider = PaymentProvider.JqfWechatJsapi;

  constructor(private readonly configFactory: JqfPayConfigFactory) {}

  async createRecharge(input: RechargeCreateInput): Promise<RechargeCreateResult> {
    if (!input.payerOpenid) {
      throw new BadRequestException('公众号支付缺少付款人 openid，请先微信登录');
    }
    const cfg = await this.configFactory.load();
    const result = await createJqfUnifiedOrder(cfg, input, 'WX_JSAPI', {
      openid: input.payerOpenid,
    });
    if (result.payDataType !== 'wxapp' || !result.payData) {
      throw new BadGatewayException(
        `计全付未返回微信拉起参数（payDataType=${result.payDataType}）`,
      );
    }
    return { qrCode: '', jsapiParams: parsePayParams(result.payData) };
  }

  async parseCallback(req: PaymentCallbackRequest): Promise<PaymentCallbackResult> {
    const cfg = await this.configFactory.load();
    return parseJqfCallback(cfg, req);
  }

  async queryTrade(outTradeNo: string): Promise<PaymentQueryResult> {
    const cfg = await this.configFactory.load();
    return queryJqfTrade(cfg, outTradeNo);
  }

  callbackAck(): string {
    return jqfCallbackAck();
  }
}

/** 解析 payData 中的 JSBridge 拉起参数并校验完整性。 */
function parsePayParams(payData: string): WechatJsapiPayParams {
  let raw: unknown;
  try {
    raw = JSON.parse(payData);
  } catch {
    throw new BadGatewayException('计全付微信拉起参数解析失败');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new BadGatewayException('计全付微信拉起参数格式异常');
  }
  const params = raw as Record<string, unknown>;
  const appId = params.appId;
  const timeStamp = params.timeStamp;
  const nonceStr = params.nonceStr;
  const packageValue = params.package;
  const signType = params.signType;
  const paySign = params.paySign;
  if (
    typeof appId !== 'string' ||
    typeof timeStamp !== 'string' ||
    typeof nonceStr !== 'string' ||
    typeof packageValue !== 'string' ||
    signType !== 'RSA' ||
    typeof paySign !== 'string'
  ) {
    throw new BadGatewayException('计全付微信拉起参数字段缺失或类型异常');
  }
  return {
    appId,
    timeStamp,
    nonceStr,
    package: packageValue,
    signType,
    paySign,
  };
}
