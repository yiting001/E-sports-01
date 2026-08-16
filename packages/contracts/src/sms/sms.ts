import type { TokenPair } from '../rbac/auth';

/**
 * 短信服务商标识，与配置中心 sms.provider 取值一一对应。
 * log 为内置「日志/模拟」provider：不发送或输出验证码，仅配合开发固定码联调。
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
  /** 租户编码（选填）：多租户下限定手机号所属租户，空表示按全局/默认租户解析 */
  tenantCode?: string;
}

/** 短信验证码登录入参 */
export interface SmsLoginPayload {
  phone: string;
  /** 收到的验证码 */
  code: string;
  /** 租户编码（选填）：多租户下限定手机号所属租户 */
  tenantCode?: string;
}

/** 短信验证码注册入参：通过短信验证码注册新账号，注册用户默认分配 member 角色 */
export interface SmsRegisterPayload {
  phone: string;
  /** 收到的验证码 */
  code: string;
  /** 昵称（选填）：缺省按手机号生成 */
  nickname?: string;
  /** 注册到的租户编码（选填）：空表示注册到默认租户 */
  tenantCode?: string;
}

/** 短信验证码登录返回：登录注册合一，首登自动注册时 registered 为 true */
export interface SmsLoginResult extends TokenPair {
  /** 本次登录是否为首登自动注册的新账号 */
  registered: boolean;
}

/** 发送验证码后的返回：仅回传必要的限流信息，绝不回传验证码本身 */
export interface SendSmsCodeResult {
  /** 距离可再次发送的冷却秒数，前端据此做倒计时 */
  cooldown: number;
}
