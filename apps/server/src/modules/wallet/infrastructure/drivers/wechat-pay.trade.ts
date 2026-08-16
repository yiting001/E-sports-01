import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Aes, Rsa } from 'wechatpay-axios-plugin';
import {
  PaymentCallbackRequest,
  PaymentCallbackResult,
  PaymentQueryResult,
} from '../../domain/payment-port.interface';
import type { WechatPayConfig } from './wechat-pay.config';
import { signWechatPayRequest, WECHAT_PAY_API_BASE } from './wechat-pay.request';

/** 商户订单号查单路径前缀 */
const QUERY_PATH_PREFIX = '/v3/pay/transactions/out-trade-no/';

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
 * 微信支付 v3 交易公共能力（Native 与 JSAPI 驱动共用）：
 * 回调验签（RSA）+ 报文解密（AES-GCM）、商户订单号查单、回调应答报文。
 * 两种下单方式共享同一商户凭证与回调协议，抽出公共函数避免驱动间复制。
 */

/** 验签并解析微信支付异步回调；验签失败抛异常。 */
export function parseWechatPayCallback(
  cfg: WechatPayConfig,
  req: PaymentCallbackRequest,
): PaymentCallbackResult {
  verifyWechatCallback(cfg, req);
  const envelope = JSON.parse(req.rawBody) as CallbackEnvelope;
  const { ciphertext, nonce, associated_data } = envelope.resource;
  const plain = Aes.AesGcm.decrypt(ciphertext, cfg.apiV3Key, nonce, associated_data);
  const resource = JSON.parse(plain) as DecryptedResource;
  return {
    outTradeNo: resource.out_trade_no,
    providerTradeNo: resource.transaction_id,
    paidAmountFen: resource.amount.payer_total,
    success: resource.trade_state === 'SUCCESS',
  };
}

/** 商户订单号主动查单；单据不存在/未支付返回 paid=false，不抛异常。 */
export async function queryWechatPayTrade(
  cfg: WechatPayConfig,
  outTradeNo: string,
): Promise<PaymentQueryResult> {
  const path = `${QUERY_PATH_PREFIX}${encodeURIComponent(outTradeNo)}?mchid=${cfg.mchId}`;
  const authorization = signWechatPayRequest(cfg, 'GET', path, '');
  const resp = await fetch(`${WECHAT_PAY_API_BASE}${path}`, {
    headers: { Authorization: authorization, Accept: 'application/json' },
  });
  // 单据不存在（用户未支付）等非 200 均视为未支付，交由上层继续轮询
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

/** 处理成功后应答给微信的报文。 */
export function wechatPayCallbackAck(): string {
  return JSON.stringify({ code: 'SUCCESS', message: '成功' });
}

/** 验证回调签名（timestamp\nnonce\nbody\n 经平台公钥验签） */
function verifyWechatCallback(cfg: WechatPayConfig, req: PaymentCallbackRequest): void {
  if (!cfg.platformPublicKey) {
    throw new ServiceUnavailableException('微信支付平台证书未配置，无法校验回调');
  }
  const timestamp = req.headers['wechatpay-timestamp'] ?? '';
  const nonce = req.headers['wechatpay-nonce'] ?? '';
  const signature = req.headers['wechatpay-signature'] ?? '';
  const message = `${timestamp}\n${nonce}\n${req.rawBody}\n`;
  if (!Rsa.verify(message, signature, cfg.platformPublicKey)) {
    throw new BadRequestException('微信回调验签失败');
  }
}
