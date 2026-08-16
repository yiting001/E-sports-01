import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProvider } from '@app/contracts';
import {
  PaymentCallbackRequest,
  PaymentCallbackResult,
  PaymentPort,
  PaymentQueryResult,
  RechargeCreateInput,
  RechargeCreateResult,
} from '../../domain/payment-port.interface';
import { WechatPayConfigFactory } from './wechat-pay.config';
import { signWechatPayRequest, WECHAT_PAY_API_BASE } from './wechat-pay.request';
import {
  parseWechatPayCallback,
  queryWechatPayTrade,
  wechatPayCallbackAck,
} from './wechat-pay.trade';

/** Native 下单路径 */
const NATIVE_PATH = '/v3/pay/transactions/native';

/** Native 下单成功响应体 */
interface NativePrepayResponse {
  code_url: string;
}

/**
 * 微信支付 v3「Native 扫码支付」驱动。
 * 下单返回 code_url 供前端渲染二维码；回调验签解密、主动查单与回调应答
 * 由 wechat-pay.trade 公共函数实现（与 JSAPI 驱动共用同一商户凭证与协议）。
 */
@Injectable()
export class WechatPaymentDriver implements PaymentPort {
  readonly provider = PaymentProvider.Wechat;

  constructor(private readonly configFactory: WechatPayConfigFactory) {}

  async createRecharge(input: RechargeCreateInput): Promise<RechargeCreateResult> {
    const cfg = await this.configFactory.load();
    const body = JSON.stringify({
      appid: cfg.appId,
      mchid: cfg.mchId,
      description: input.subject,
      out_trade_no: input.outTradeNo,
      notify_url: input.notifyUrl,
      amount: { total: input.amountFen, currency: 'CNY' },
    });
    const authorization = signWechatPayRequest(cfg, 'POST', NATIVE_PATH, body);
    const resp = await fetch(`${WECHAT_PAY_API_BASE}${NATIVE_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    });
    const text = await resp.text();
    if (resp.status !== 200) {
      throw new BadRequestException(`微信下单失败：${text}`);
    }
    const data = JSON.parse(text) as NativePrepayResponse;
    return { qrCode: data.code_url };
  }

  async parseCallback(req: PaymentCallbackRequest): Promise<PaymentCallbackResult> {
    const cfg = await this.configFactory.load();
    return parseWechatPayCallback(cfg, req);
  }

  async queryTrade(outTradeNo: string): Promise<PaymentQueryResult> {
    const cfg = await this.configFactory.load();
    return queryWechatPayTrade(cfg, outTradeNo);
  }

  callbackAck(): string {
    return wechatPayCallbackAck();
  }
}
