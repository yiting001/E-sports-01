import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaymentProvider } from '@app/contracts';
import { Aes, Formatter, Rsa } from 'wechatpay-axios-plugin';
import {
  PaymentCallbackRequest,
  PaymentCallbackResult,
  PaymentPort,
  PaymentQueryResult,
  RechargeCreateInput,
  RechargeCreateResult,
} from '../../domain/payment-port.interface';
import { WechatPayConfig, WechatPayConfigFactory } from './wechat-pay.config';

/** 微信支付 v3 API 根地址 */
const WECHAT_API_BASE = 'https://api.mch.weixin.qq.com';
/** Native 下单路径 */
const NATIVE_PATH = '/v3/pay/transactions/native';
/** 商户订单号查单路径前缀 */
const QUERY_PATH_PREFIX = '/v3/pay/transactions/out-trade-no/';

/** Native 下单成功响应体 */
interface NativePrepayResponse {
  code_url: string;
}

/** 查单响应体（仅取所需字段） */
interface TransactionQueryResponse {
  transaction_id?: string;
  trade_state: string;
  amount?: { payer_total?: number };
}

/** 回调报文外层结构 */
interface CallbackEnvelope {
  resource: {
    ciphertext: string;
    nonce: string;
    associated_data: string;
  };
}

/** 回调解密后的交易资源 */
interface DecryptedResource {
  out_trade_no: string;
  transaction_id: string;
  trade_state: string;
  amount: { payer_total: number };
}

/**
 * 微信支付 v3「Native 扫码支付」充值驱动。
 * 依官方协议自行完成请求签名（RSA）与回调验签（RSA）+ 报文解密（AES-GCM），
 * 下单返回 code_url 供前端渲染二维码；支付后微信异步通知，验签解密后入账；
 * 同时提供商户订单号查单接口，回调未达时兜底确认支付结果。
 */
@Injectable()
export class WechatPaymentDriver implements PaymentPort {
  readonly provider = PaymentProvider.Wechat;

  constructor(private readonly configFactory: WechatPayConfigFactory) {}

  async createRecharge(
    input: RechargeCreateInput,
  ): Promise<RechargeCreateResult> {
    const cfg = await this.configFactory.load();
    const body = JSON.stringify({
      appid: cfg.appId,
      mchid: cfg.mchId,
      description: input.subject,
      out_trade_no: input.outTradeNo,
      notify_url: input.notifyUrl,
      amount: { total: input.amountFen, currency: 'CNY' },
    });
    const authorization = this.sign(cfg, 'POST', NATIVE_PATH, body);
    const resp = await fetch(`${WECHAT_API_BASE}${NATIVE_PATH}`, {
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

  async parseCallback(
    req: PaymentCallbackRequest,
  ): Promise<PaymentCallbackResult> {
    const cfg = await this.configFactory.load();
    this.verify(cfg, req);
    const envelope = JSON.parse(req.rawBody) as CallbackEnvelope;
    const { ciphertext, nonce, associated_data } = envelope.resource;
    const plain = Aes.AesGcm.decrypt(
      ciphertext,
      cfg.apiV3Key,
      nonce,
      associated_data,
    );
    const resource = JSON.parse(plain) as DecryptedResource;
    return {
      outTradeNo: resource.out_trade_no,
      providerTradeNo: resource.transaction_id,
      paidAmountFen: resource.amount.payer_total,
      success: resource.trade_state === 'SUCCESS',
    };
  }

  async queryTrade(outTradeNo: string): Promise<PaymentQueryResult> {
    const cfg = await this.configFactory.load();
    const path = `${QUERY_PATH_PREFIX}${encodeURIComponent(outTradeNo)}?mchid=${cfg.mchId}`;
    const authorization = this.sign(cfg, 'GET', path, '');
    const resp = await fetch(`${WECHAT_API_BASE}${path}`, {
      headers: { Authorization: authorization, Accept: 'application/json' },
    });
    // 单据不存在（用户未扫码）等非 200 均视为未支付，交由上层继续轮询
    if (resp.status !== 200) {
      return { paid: false, providerTradeNo: '', paidAmountFen: 0 };
    }
    const data = (await resp.json()) as TransactionQueryResponse;
    if (data.trade_state !== 'SUCCESS') {
      return { paid: false, providerTradeNo: '', paidAmountFen: 0 };
    }
    return {
      paid: true,
      providerTradeNo: data.transaction_id ?? '',
      paidAmountFen: data.amount?.payer_total ?? 0,
    };
  }

  callbackAck(): string {
    return JSON.stringify({ code: 'SUCCESS', message: '成功' });
  }

  /** 构造请求 Authorization 头（METHOD\nURL\ntimestamp\nnonce\nbody\n 经 RSA 签名） */
  private sign(
    cfg: WechatPayConfig,
    method: string,
    path: string,
    body: string,
  ): string {
    const nonce = Formatter.nonce();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = Rsa.sign(message, cfg.privateKey);
    return Formatter.authorization(
      cfg.mchId,
      nonce,
      signature,
      timestamp,
      cfg.serial,
    );
  }

  /** 验证回调签名（timestamp\nnonce\nbody\n 经平台公钥验签） */
  private verify(cfg: WechatPayConfig, req: PaymentCallbackRequest): void {
    if (!cfg.platformPublicKey) {
      throw new ServiceUnavailableException(
        '微信支付平台证书未配置，无法校验回调',
      );
    }
    const timestamp = req.headers['wechatpay-timestamp'] ?? '';
    const nonce = req.headers['wechatpay-nonce'] ?? '';
    const signature = req.headers['wechatpay-signature'] ?? '';
    const message = `${timestamp}\n${nonce}\n${req.rawBody}\n`;
    if (!Rsa.verify(message, signature, cfg.platformPublicKey)) {
      throw new BadRequestException('微信回调验签失败');
    }
  }
}
