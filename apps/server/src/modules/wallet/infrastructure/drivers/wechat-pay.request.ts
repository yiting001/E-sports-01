import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { Formatter, Rsa } from 'wechatpay-axios-plugin';
import { RefundOutcomeUnknownError } from '../../domain/refund-port.interface';
import type { WechatPayConfig } from './wechat-pay.config';

/** 微信支付 v3 API 根地址。 */
export const WECHAT_PAY_API_BASE = 'https://api.mch.weixin.qq.com';
const WECHAT_PAY_RESPONSE_MAX_AGE_SECONDS = 300;

/** 构造微信支付 v3 请求 Authorization 头。 */
export function signWechatPayRequest(
  config: WechatPayConfig,
  method: string,
  path: string,
  body: string,
): string {
  const nonce = Formatter.nonce();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = Rsa.sign(message, config.privateKey);
  return Formatter.authorization(config.mchId, nonce, signature, timestamp, config.serial);
}

/** 退款 API 响应必须具备平台公钥和匹配的证书序列号，缺失时禁止发起资金请求。 */
export function assertWechatPayResponseVerificationConfig(config: WechatPayConfig): void {
  if (!config.platformPublicKey || !config.platformSerial) {
    throw new ServiceUnavailableException('微信支付平台证书未配置，无法校验响应');
  }
}

/** 先按微信支付 v3 头部验签，再把原始响应体交给调用方解析。 */
export async function readVerifiedWechatPayResponse(
  config: WechatPayConfig,
  response: Response,
): Promise<string> {
  assertWechatPayResponseVerificationConfig(config);
  let body: string;
  try {
    body = await response.text();
  } catch {
    throw new RefundOutcomeUnknownError('微信退款响应读取失败，渠道结果未知');
  }
  const timestamp = response.headers.get('Wechatpay-Timestamp') ?? '';
  const nonce = response.headers.get('Wechatpay-Nonce') ?? '';
  const signature = response.headers.get('Wechatpay-Signature') ?? '';
  const serial = response.headers.get('Wechatpay-Serial') ?? '';
  if (!timestamp || !nonce || !signature || !serial) {
    throw new BadGatewayException('微信退款响应缺少验签头');
  }
  if (serial.toUpperCase() !== config.platformSerial.toUpperCase()) {
    throw new BadGatewayException('微信退款响应平台证书序列号不匹配');
  }
  const responseTimestamp = Number(timestamp);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(responseTimestamp) ||
    Math.abs(currentTimestamp - responseTimestamp) > WECHAT_PAY_RESPONSE_MAX_AGE_SECONDS
  ) {
    throw new BadGatewayException('微信退款响应时间戳无效');
  }
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  let verified = false;
  try {
    verified = Rsa.verify(message, signature, config.platformPublicKey);
  } catch {
    verified = false;
  }
  if (!verified) {
    throw new BadGatewayException('微信退款响应验签失败');
  }
  return body;
}
