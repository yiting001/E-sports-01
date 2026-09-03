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
 * 计全付「支付宝二维码支付」驱动（wayCode=ALI_QR，统一下单 pageId=39）。
 * 与微信扫码同属「二维码类」支付方式：channelExtra.payDataType=codeUrl 时 payData 即二维码内容；
 * 回调验签、主动查单与 SUCCESS 应答复用 jqf-pay.trade 公共函数。
 */
@Injectable()
export class JqfAlipayPaymentDriver implements PaymentPort {
  readonly provider = PaymentProvider.JqfAlipay;

  constructor(private readonly configFactory: JqfPayConfigFactory) {}

  async createRecharge(input: RechargeCreateInput): Promise<RechargeCreateResult> {
    const cfg = await this.configFactory.load();
    const result = await createJqfUnifiedOrder(cfg, input, 'ALI_QR', {
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
