import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from '@app/contracts';
import { SmsCodeMessage, SmsPort } from '../../domain/sms-port.interface';

/**
 * 日志/模拟短信驱动。
 * 不真正调用任何云服务，只把验证码打到日志，便于本地或无密钥环境联调短信登录流程。
 */
@Injectable()
export class LogSmsDriver implements SmsPort {
  readonly provider = SmsProvider.Log;
  private readonly logger = new Logger(LogSmsDriver.name);

  sendCode({ phone, code }: SmsCodeMessage): Promise<void> {
    this.logger.log(`[模拟短信] 向 ${phone} 发送验证码：${code}`);
    return Promise.resolve();
  }
}
