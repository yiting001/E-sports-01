import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigValueType } from '@app/contracts';
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

  /** 幂等迁移库中旧配置：命中旧值则改值，类型不一致则纠正；已被人工改动的值不动 */
  private async migrateLegacyValues(): Promise<void> {
    const def = new Map(DEFAULT_CONFIGS.map((c) => [c.key, c]));
    for (const migration of CONFIG_MIGRATIONS) {
      const item = await this.repository.findByKey(migration.key);
      if (!item) {
        continue;
      }
      const patch: {
        key: string;
        value?: string;
        type?: ConfigValueType;
        remark?: string;
      } = { key: migration.key };
      if (
        migration.legacyValue !== undefined &&
        migration.newValue !== undefined &&
        item.value === migration.legacyValue
      ) {
        patch.value = migration.newValue;
      }
      if (migration.expectedType && item.type !== migration.expectedType) {
        patch.type = migration.expectedType;
        patch.remark = def.get(migration.key)?.remark;
      }
      if (patch.value === undefined && patch.type === undefined) {
        continue;
      }
      await this.repository.upsert(patch);
      this.logger.log(`已迁移配置 ${migration.key}`);
    }
  }
}
