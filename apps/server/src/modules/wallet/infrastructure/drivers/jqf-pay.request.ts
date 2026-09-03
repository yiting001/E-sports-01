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
 * 计全付 MD5 签名（技术规范 pageId=213）：过滤空值与 sign 字段 → 参数名区分大小写、
 * 按 ASCII 码从小到大排序 → 拼 key1=value1&key2=value2 → 末尾追加 &key=apiKey → MD5 转大写。
 */
export function signJqfParams(params: Record<string, JqfParamValue>, apiKey: string): string {
  const pairs = Object.entries(params)
    .filter(([key, value]) => key !== 'sign' && value !== undefined && String(value) !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
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

/** 请求时间戳：接口文档约定为 13 位毫秒时间戳。 */
export function jqfReqTime(now = new Date()): string {
  return String(now.getTime());
}

/**
 * 读取计全付整数字段：异步通知以 application/x-www-form-urlencoded 送达，
 * 数值字段（state/amount）到达时为字符串，需与 JSON 数值同等接受。
 */
export function readJqfInt(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

/**
 * 读取计全付以「分」计的金额字段（如手续费 mchOrderFeeAmount 为 BigDecimal 形式 `800.000000`），
 * 四舍五入到整数分；缺失或非法返回 null。
 */
export function readJqfFen(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value) : null;
  }
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
    return Math.round(Number(value));
  }
  return null;
}

/** 读取可选字符串字段（空串视为缺失）。 */
export function readJqfString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
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
