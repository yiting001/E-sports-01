import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  CONFIG_REPOSITORY,
  ConfigRepository,
} from '../domain/config-repository.interface';
import { DEFAULT_CONFIGS } from '../domain/config-defaults';

/**
 * 配置默认值播种器。
 * 启动时把缺失的默认配置写入配置中心（幂等，只补不覆盖），
 * 保证业务模块首次运行即可从配置中心读到可用值。
 */
@Injectable()
export class ConfigSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConfigSeeder.name);

  constructor(@Inject(CONFIG_REPOSITORY) private readonly repository: ConfigRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    const created = await this.repository.createMissing(
      DEFAULT_CONFIGS.map((c) => ({
        key: c.key,
        value: c.value,
        type: c.type,
        group: c.group,
        remark: c.remark,
        secret: c.secret ?? false,
      })),
    );
    if (created > 0) {
      this.logger.log(`已播种 ${created} 条默认配置`);
    }
  }
}
