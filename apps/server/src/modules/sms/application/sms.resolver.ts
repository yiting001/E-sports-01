import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CONFIG_KEYS, SmsProvider } from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import { SMS_PORTS, SmsPort } from '../domain/sms-port.interface';

/**
 * 短信策略解析器。
 * 运行时读取配置中心 sms.provider，从已注册策略集合中挑选对应实现，
 * 切换短信服务商只需改配置、无需重启或改代码（策略模式 + 配置驱动）。
 */
@Injectable()
export class SmsResolver {
  constructor(
    @Inject(SMS_PORTS) private readonly ports: SmsPort[],
    private readonly config: ConfigService,
  ) {}

  /** 解析当前生效的短信驱动 */
  async resolve(): Promise<SmsPort> {
    const provider = await this.config.getString(
      CONFIG_KEYS.sms.provider,
      SmsProvider.Log,
    );
    const port = this.ports.find((p) => p.provider === provider);
    if (!port) {
      throw new InternalServerErrorException(`未注册的短信服务商：${provider}`);
    }
    return port;
  }
}
