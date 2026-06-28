import { randomInt } from 'crypto';

/**
 * 生成商户订单号：前缀 + 毫秒时间戳 + 6 位随机数。
 * 全局唯一、长度可控（<64），作为充值/提现的幂等键。
 */
export function buildOrderNo(prefix: string): string {
  const timestamp = Date.now().toString();
  const random = randomInt(0, 1_000_000).toString().padStart(6, '0');
  return `${prefix}${timestamp}${random}`;
}
