import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProvider, WechatJsapiPayParams } from '@app/contracts';
import { Formatter, Rsa } from 'wechatpay-axios-plugin';
import {
  PaymentCallbackRequest,
  PaymentCallbackResult,
  PaymentPort,
  PaymentQueryResult,
  RechargeCreateInput,
  RechargeCreateResult,
} from '../../domain/payment-port.interface';
import { WechatPayConfig, WechatPayConfigFactory } from './wechat-pay.config';
import { signWechatPayRequest, WECHAT_PAY_API_BASE } from './wechat-pay.request';
import {
  parseWechatPayCallback,
  queryWechatPayTrade,
  wechatPayCallbackAck,
} from './wechat-pay.trade';

/** JSAPI 下单路径 */
const JSAPI_PATH = '/v3/pay/transactions/jsapi';

/** JSAPI 下单成功响应体 */
interface JsapiPrepayResponse {
  prepay_id: string;
}

/**
 * 微信支付 v3「公众号 JSAPI 支付」驱动。
 * 微信内浏览器场景使用：按付款人 openid 下单取 prepay_id，
 * 再以商户私钥对拉起参数做 RSA 签名，前端经 WeixinJSBridge 直接调起收银台；
 * 回调验签解密、主动查单与回调应答复用 wechat-pay.trade 公共函数。
 * 注意：wallet.wechat.appId 必须是与商户号绑定的公众号 AppId。
 */
@Injectable()
export class WechatJsapiPaymentDriver implements PaymentPort {
  readonly provider = PaymentProvider.WechatJsapi;

  constructor(private readonly configFactory: WechatPayConfigFactory) {}

  async createRecharge(input: RechargeCreateInput): Promise<RechargeCreateResult> {
    if (!input.payerOpenid) {
      throw new BadRequestException('公众号支付缺少付款人 openid，请先微信登录');
    }
    const cfg = await this.configFactory.load();
    const body = JSON.stringify({
      appid: cfg.appId,
      mchid: cfg.mchId,
      description: input.subject,
      out_trade_no: input.outTradeNo,
      notify_url: input.notifyUrl,
      amount: { total: input.amountFen, currency: 'CNY' },
      payer: { openid: input.payerOpenid },
    });
    const authorization = signWechatPayRequest(cfg, 'POST', JSAPI_PATH, body);
    const resp = await fetch(`${WECHAT_PAY_API_BASE}${JSAPI_PATH}`, {
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
    const data = JSON.parse(text) as JsapiPrepayResponse;
    return { qrCode: '', jsapiParams: this.buildPayParams(cfg, data.prepay_id) };
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

  /** 按官方规则（appId\n时间戳\n随机串\npackage\n）用商户私钥 RSA 签名拉起参数。 */
  private buildPayParams(cfg: WechatPayConfig, prepayId: string): WechatJsapiPayParams {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = Formatter.nonce();
    const packageValue = `prepay_id=${prepayId}`;
    const message = `${cfg.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;
    const paySign = Rsa.sign(message, cfg.privateKey);
    return {
      appId: cfg.appId,
      timeStamp,
      nonceStr,
      package: packageValue,
      signType: 'RSA',
      paySign,
    };
  }
}
