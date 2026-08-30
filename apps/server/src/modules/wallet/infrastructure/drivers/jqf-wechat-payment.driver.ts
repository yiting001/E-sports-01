import { BadGatewayException, Injectable } from '@nestjs/common';
import { PaymentProvider } from '@app/contracts';
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

/** 可作为二维码内容返回的 payDataType */
const QR_PAY_DATA_TYPES = new Set(['codeUrl', 'codeImgUrl', 'payurl']);

/**
 * 计全付「微信扫码支付」驱动（wayCode=WX_NATIVE）。
 * 统一下单要求 payDataType=codeUrl，payData 即二维码内容；
 * 回调 MD5 验签、主动查单与 SUCCESS 应答由 jqf-pay.trade 公共函数实现。
 */
@Injectable()
export class JqfWechatPaymentDriver implements PaymentPort {
  readonly provider = PaymentProvider.JqfWechat;

  constructor(private readonly configFactory: JqfPayConfigFactory) {}

  async createRecharge(input: RechargeCreateInput): Promise<RechargeCreateResult> {
    const cfg = await this.configFactory.load();
    const result = await createJqfUnifiedOrder(cfg, input, 'WX_NATIVE', {
      payDataType: 'codeUrl',
    });
    if (!QR_PAY_DATA_TYPES.has(result.payDataType) || !result.payData) {
      throw new BadGatewayException(`计全付未返回二维码（payDataType=${result.payDataType}）`);
    }
    return { qrCode: result.payData };
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
