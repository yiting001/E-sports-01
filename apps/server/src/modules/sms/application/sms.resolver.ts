import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CONFIG_KEYS, SmsProvider } from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import { SMS_PORTS, SmsPort } from '../domain/sms-port.interface';
import { SMS_RUNTIME_POLICY, type SmsRuntimePolicy } from '../domain/sms-runtime-policy.interface';

/**
 * 短信策略解析器。
 * 运行时读取配置中心 sms.provider，从已注册策略集合中挑选对应实现，
 * 切换短信服务商只需改配置、无需重启或改代码（策略模式 + 配置驱动）。
 */
@Injectable()
export class SmsResolver {
  constructor(
    @Inject(SMS_PORTS) private readonly ports: SmsPort[],
    @Inject(SMS_RUNTIME_POLICY) private readonly runtime: SmsRuntimePolicy,
    private readonly config: ConfigService,
  ) {}

  /** 解析当前生效的短信驱动 */
  async resolve(): Promise<SmsPort> {
    const provider = await this.config.getString(CONFIG_KEYS.sms.provider, SmsProvider.Log);
    if (provider === SmsProvider.Log) {
      const message = this.runtime.isProduction()
        ? '生产环境禁止使用日志短信驱动，请配置真实短信服务商'
        : '日志短信驱动不会发送或输出验证码，请启用开发固定码或配置真实短信服务商';
      throw new InternalServerErrorException(message);
    }
    const port = this.ports.find((p) => p.provider === provider);
    if (!port) {
      throw new InternalServerErrorException(`未注册的短信服务商：${provider}`);
    }
    return port;
  }
}
