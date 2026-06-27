import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sms as VolcanoSms } from '@volcengine/openapi';
import { CONFIG_KEYS, SmsProvider } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { SmsCodeMessage, SmsPort } from '../../domain/sms-port.interface';

/**
 * 火山引擎短信驱动。
 * 凭证、短信账号、签名、模板均来自配置中心，模板变量以 JSON 传入（验证码键为 code）。
 */
@Injectable()
export class VolcanoSmsDriver implements SmsPort {
  readonly provider = SmsProvider.Volcano;

  constructor(private readonly config: ConfigService) {}

  async sendCode({ phone, code }: SmsCodeMessage): Promise<void> {
    const accessKeyId = await this.config.getString(CONFIG_KEYS.sms.volcanoAccessKeyId, '');
    const secretKey = await this.config.getString(CONFIG_KEYS.sms.volcanoSecretAccessKey, '');
    const smsAccount = await this.config.getString(CONFIG_KEYS.sms.volcanoSmsAccount, '');
    const signName = await this.config.getString(CONFIG_KEYS.sms.volcanoSignName, '');
    const templateId = await this.config.getString(CONFIG_KEYS.sms.volcanoTemplateId, '');
    const region = await this.config.getString(CONFIG_KEYS.sms.volcanoRegion, 'cn-north-1');

    if (!accessKeyId || !secretKey || !smsAccount || !signName || !templateId) {
      throw new ServiceUnavailableException('火山引擎短信配置不完整，请在配置中心补全凭证/账号/签名/模板');
    }

    const service = new VolcanoSms.SmsService({
      accessKeyId,
      secretKey,
      region,
      serviceName: 'volcSMS',
    });
    const response = await service.Send({
      SmsAccount: smsAccount,
      Sign: signName,
      TemplateID: templateId,
      TemplateParam: JSON.stringify({ code }),
      PhoneNumbers: phone,
      Tag: '',
      UserExtCode: '',
    });

    const error = response.ResponseMetadata?.Error;
    if (error) {
      throw new ServiceUnavailableException(
        `火山引擎短信发送失败：${error.Message ?? '未知错误'}`,
      );
    }
  }
}
