import { createHash } from 'node:crypto';
import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { JqfPayConfig } from './jqf-pay.config';

/** 计全付接口版本 */
export const JQF_API_VERSION = '1.0';
/** 计全付签名方式（当前仅对接 MD5） */
export const JQF_SIGN_TYPE = 'MD5';

/** 可参与签名的参数值 */
type JqfParamValue = string | number | undefined;

/** 计全付统一响应包裹 */
interface JqfEnvelope {
  code: number;
  msg: string;
  data: unknown;
}

/**
 * 计全付 MD5 签名：过滤空值与 sign 字段 → 按 key ASCII 字典序（不区分大小写）排序
 * → 拼 key1=value1&key2=value2 → 末尾追加 &key=apiKey → MD5 转大写。
 */
export function signJqfParams(params: Record<string, JqfParamValue>, apiKey: string): string {
  const pairs = Object.entries(params)
    .filter(([key, value]) => key !== 'sign' && value !== undefined && String(value) !== '')
    .sort(([a], [b]) => {
      const la = a.toLowerCase();
      const lb = b.toLowerCase();
      return la < lb ? -1 : la > lb ? 1 : 0;
    })
    .map(([key, value]) => `${key}=${String(value)}`);
  const source = `${pairs.join('&')}&key=${apiKey}`;
  return createHash('md5').update(source, 'utf8').digest('hex').toUpperCase();
}

/** 校验计全付异步通知签名（body 中 sign 与本地重算结果比对）。 */
export function verifyJqfSign(body: Record<string, unknown>, apiKey: string): boolean {
  const sign = body.sign;
  if (typeof sign !== 'string' || !sign) {
    return false;
  }
  const params: Record<string, JqfParamValue> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === 'sign') {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      params[key] = value;
    }
  }
  return signJqfParams(params, apiKey) === sign.toUpperCase();
}

/** 请求时间戳，格式 yyyyMMddHHmmss（东八区）。 */
export function jqfReqTime(now = new Date()): string {
  const cst = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${cst.getUTCFullYear()}${pad(cst.getUTCMonth() + 1)}${pad(cst.getUTCDate())}` +
    `${pad(cst.getUTCHours())}${pad(cst.getUTCMinutes())}${pad(cst.getUTCSeconds())}`
  );
}

/**
 * 调用计全付接口：自动补公共参数（mchNo/appId/version/signType/reqTime）并签名，
 * 业务失败（code != 0）转为清晰错误，成功返回 data。
 */
export async function postJqf(
  cfg: JqfPayConfig,
  path: string,
  params: Record<string, JqfParamValue>,
): Promise<Record<string, unknown>> {
  const payload: Record<string, JqfParamValue> = {
    ...params,
    mchNo: cfg.mchNo,
    appId: cfg.appId,
    version: JQF_API_VERSION,
    signType: JQF_SIGN_TYPE,
    reqTime: jqfReqTime(),
  };
  const body = JSON.stringify({ ...payload, sign: signJqfParams(payload, cfg.apiKey) });
  let resp: Response;
  try {
    resp = await fetch(`${cfg.apiBase}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
    });
  } catch {
    throw new BadGatewayException('计全付网关请求失败，请稍后重试');
  }
  const text = await resp.text();
  let envelope: JqfEnvelope;
  try {
    envelope = JSON.parse(text) as JqfEnvelope;
  } catch {
    throw new BadGatewayException('计全付响应格式异常');
  }
  if (typeof envelope.code !== 'number' || envelope.code !== 0) {
    throw new BadRequestException(`计全付接口失败：${envelope.msg ?? '未知错误'}`);
  }
  if (typeof envelope.data !== 'object' || envelope.data === null || Array.isArray(envelope.data)) {
    throw new BadGatewayException('计全付响应缺少数据');
  }
  return envelope.data as Record<string, unknown>;
}
