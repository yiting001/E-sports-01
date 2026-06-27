import { SmsProvider } from '@app/contracts';

/** 验证码短信发送入参（应用层生成验证码，驱动只负责把它发出去） */
export interface SmsCodeMessage {
  /** 接收手机号 */
  phone: string;
  /** 验证码明文 */
  code: string;
}

/**
 * 短信发送端口（策略模式抽象）。
 * 阿里云 / 腾讯云 / 火山引擎 / 日志模拟等实现统一遵循该接口，
 * 运行时由配置中心 sms.provider 选择具体策略，新增服务商只需实现该接口并注册，
 * 无需改动上层用例。
 */
export interface SmsPort {
  /** 服务商标识，与配置中心 sms.provider 取值对应 */
  readonly provider: SmsProvider;
  /** 发送验证码短信，失败时抛异常 */
  sendCode(message: SmsCodeMessage): Promise<void>;
}

/** 短信驱动集合注入令牌（聚合所有已注册策略，供解析器按配置挑选） */
export const SMS_PORTS = Symbol('SMS_PORTS');
