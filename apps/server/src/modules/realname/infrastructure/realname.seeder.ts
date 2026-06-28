import { randomBytes } from 'node:crypto';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigGroup, ConfigValueType } from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import { REALNAME_ID_CIPHER_KEY } from '../domain/realname.constants';

/**
 * 实名模块播种器。
 * 启动时若身份证加密密钥缺失，则随机生成并持久化（仅首次，幂等），
 * 保证密钥稳定可解密历史数据，且不以硬编码常量充当密钥。
 */
@Injectable()
export class RealnameSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(RealnameSeeder.name);

  constructor(private readonly config: ConfigService) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.config.getRaw(REALNAME_ID_CIPHER_KEY);
    if (existing) {
      return;
    }
    await this.config.setRaw(
      REALNAME_ID_CIPHER_KEY,
      randomBytes(32).toString('hex'),
      {
        type: ConfigValueType.String,
        group: ConfigGroup.Realname,
        remark: '身份证号加密密钥（系统自动生成，请勿修改）',
        secret: true,
      },
    );
    this.logger.log('已生成实名身份证加密密钥');
  }
}
