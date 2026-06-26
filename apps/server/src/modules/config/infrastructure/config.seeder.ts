import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  CONFIG_REPOSITORY,
  ConfigRepository,
} from '../domain/config-repository.interface';
import { CONFIG_MIGRATIONS, DEFAULT_CONFIGS } from '../domain/config-defaults';

/**
 * 配置默认值播种器。
 * 启动时把缺失的默认配置写入配置中心（幂等，只补不覆盖），
 * 并对历史默认值做幂等迁移（仅当仍为旧默认值时改写），
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
    await this.migrateLegacyValues();
  }

  /** 把仍停留在旧默认值的配置项就地改写为新默认值；已被人工改动的值不动 */
  private async migrateLegacyValues(): Promise<void> {
    const def = new Map(DEFAULT_CONFIGS.map((c) => [c.key, c]));
    for (const migration of CONFIG_MIGRATIONS) {
      const item = await this.repository.findByKey(migration.key);
      if (!item || item.value !== migration.legacyValue) {
        continue;
      }
      await this.repository.upsert({
        key: migration.key,
        value: migration.newValue,
        remark: def.get(migration.key)?.remark,
      });
      this.logger.log(
        `已迁移配置 ${migration.key}：${migration.legacyValue} → ${migration.newValue}`,
      );
    }
  }
}
