import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Dysmsapi, { SendSmsRequest } from '@alicloud/dysmsapi20170525';
import { $OpenApiUtil } from '@alicloud/openapi-core';
import { CONFIG_KEYS, SmsProvider } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { SmsCodeMessage, SmsPort } from '../../domain/sms-port.interface';

/**
 * 阿里云短信驱动。
 * 凭证、签名、模板均来自配置中心，客户端在发送时按配置即时构建，
 * 配置缺失时给出明确错误而非静默失败。
 */
@Injectable()
export class AliyunSmsDriver implements SmsPort {
  readonly provider = SmsProvider.Aliyun;

  constructor(private readonly config: ConfigService) {}

  async sendCode({ phone, code }: SmsCodeMessage): Promise<void> {
    const accessKeyId = await this.config.getString(CONFIG_KEYS.sms.aliyunAccessKeyId, '');
    const accessKeySecret = await this.config.getString(CONFIG_KEYS.sms.aliyunAccessKeySecret, '');
    const signName = await this.config.getString(CONFIG_KEYS.sms.aliyunSignName, '');
    const templateCode = await this.config.getString(CONFIG_KEYS.sms.aliyunTemplateCode, '');
    const endpoint = await this.config.getString(CONFIG_KEYS.sms.aliyunEndpoint, 'dysmsapi.aliyuncs.com');

    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
      throw new ServiceUnavailableException('阿里云短信配置不完整，请在配置中心补全凭证/签名/模板');
    }

    const apiConfig = new $OpenApiUtil.Config({ accessKeyId, accessKeySecret });
    apiConfig.endpoint = endpoint;
    const client = new Dysmsapi(apiConfig);

    const request = new SendSmsRequest({
      phoneNumbers: phone,
      signName,
      templateCode,
      templateParam: JSON.stringify({ code }),
    });

    const response = await client.sendSms(request);
    if (response.body?.code !== 'OK') {
      throw new ServiceUnavailableException(
        `阿里云短信发送失败：${response.body?.message ?? '未知错误'}`,
      );
    }
  }
}
