/**
 * 短信服务商标识，与配置中心 sms.provider 取值一一对应。
 * log 为内置「日志/模拟」provider：不真正发短信、把验证码打到日志，便于无密钥联调。
 */
export enum SmsProvider {
  Aliyun = 'aliyun',
  Tencent = 'tencent',
  Volcano = 'volcano',
  Log = 'log',
}

/** 中国大陆手机号校验正则（单一来源，前后端 DTO 共用） */
export const CHINA_MOBILE_PATTERN = /^1[3-9]\d{9}$/;

/** 请求发送短信验证码入参 */
export interface SendSmsCodePayload {
  /** 手机号（11 位中国大陆号码） */
  phone: string;
}

/** 短信验证码登录入参 */
export interface SmsLoginPayload {
  phone: string;
  /** 收到的验证码 */
  code: string;
}

/** 发送验证码后的返回：仅回传必要的限流信息，绝不回传验证码本身 */
export interface SendSmsCodeResult {
  /** 距离可再次发送的冷却秒数，前端据此做倒计时 */
  cooldown: number;
}
