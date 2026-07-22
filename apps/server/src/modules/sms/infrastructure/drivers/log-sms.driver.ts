import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from '@app/contracts';
import { SmsCodeMessage, SmsPort } from '../../domain/sms-port.interface';

/**
 * 日志/模拟短信驱动。
 * 不真正调用任何云服务，仅记录脱敏后的发送动作；验证码不写日志。
 */
@Injectable()
export class LogSmsDriver implements SmsPort {
  readonly provider = SmsProvider.Log;
  private readonly logger = new Logger(LogSmsDriver.name);

  sendCode({ phone }: SmsCodeMessage): Promise<void> {
    this.logger.log(`[模拟短信] 已处理发码请求：${this.maskPhone(phone)}`);
    return Promise.resolve();
  }

  private maskPhone(phone: string): string {
    return phone.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
  }
}
