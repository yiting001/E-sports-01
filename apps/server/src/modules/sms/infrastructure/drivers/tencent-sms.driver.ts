import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sms as TencentSms } from 'tencentcloud-sdk-nodejs-sms';
import { CONFIG_KEYS, SmsProvider } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { SmsCodeMessage, SmsPort } from '../../domain/sms-port.interface';

/** 腾讯云短信服务接口域名 */
const TENCENT_SMS_ENDPOINT = 'sms.tencentcloudapi.com';

/**
 * 腾讯云短信驱动。
 * 腾讯云要求 E.164 带区号手机号，故按配置中心 countryCode 补全区号；
 * 模板参数按顺序传入，验证码为第一个变量。
 */
@Injectable()
export class TencentSmsDriver implements SmsPort {
  readonly provider = SmsProvider.Tencent;

  constructor(private readonly config: ConfigService) {}

  async sendCode({ phone, code }: SmsCodeMessage): Promise<void> {
    const secretId = await this.config.getString(CONFIG_KEYS.sms.tencentSecretId, '');
    const secretKey = await this.config.getString(CONFIG_KEYS.sms.tencentSecretKey, '');
    const sdkAppId = await this.config.getString(CONFIG_KEYS.sms.tencentSdkAppId, '');
    const signName = await this.config.getString(CONFIG_KEYS.sms.tencentSignName, '');
    const templateId = await this.config.getString(CONFIG_KEYS.sms.tencentTemplateId, '');
    const region = await this.config.getString(CONFIG_KEYS.sms.tencentRegion, 'ap-guangzhou');
    const countryCode = await this.config.getString(CONFIG_KEYS.sms.countryCode, '+86');

    if (!secretId || !secretKey || !sdkAppId || !signName || !templateId) {
      throw new ServiceUnavailableException('腾讯云短信配置不完整，请在配置中心补全凭证/应用/签名/模板');
    }

    const client = new TencentSms.v20210111.Client({
      credential: { secretId, secretKey },
      region,
      profile: { httpProfile: { endpoint: TENCENT_SMS_ENDPOINT } },
    });

    const response = await client.SendSms({
      PhoneNumberSet: [this.toE164(phone, countryCode)],
      SmsSdkAppId: sdkAppId,
      SignName: signName,
      TemplateId: templateId,
      TemplateParamSet: [code],
    });

    const status = response.SendStatusSet?.[0];
    if (!status || status.Code !== 'Ok') {
      throw new ServiceUnavailableException(
        `腾讯云短信发送失败：${status?.Message ?? '未知错误'}`,
      );
    }
  }

  /** 补全区号为 E.164 格式；已带 + 前缀的视为完整号码不再处理 */
  private toE164(phone: string, countryCode: string): string {
    return phone.startsWith('+') ? phone : `${countryCode}${phone}`;
  }
}
