import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG_KEYS, ConfigGroup, ConfigValueType, DEFAULT_TENANT_ID } from '@app/contracts';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '../../src/modules/config/application/config.service';
import { ListConfigsUseCase } from '../../src/modules/config/application/use-cases/list-configs.usecase';
import { RemoveConfigUseCase } from '../../src/modules/config/application/use-cases/remove-config.usecase';
import { UpsertConfigUseCase } from '../../src/modules/config/application/use-cases/upsert-config.usecase';
import { isTenantOverridableConfigKey } from '../../src/modules/config/domain/tenant-config-keys';
import { ConfigItem } from '../../src/modules/config/domain/config-item.entity';
import type { ConfigRepository } from '../../src/modules/config/domain/config-repository.interface';
import { TenantConfigOverride } from '../../src/modules/config/domain/tenant-config-override.entity';
import type { TenantConfigOverrideRepository } from '../../src/modules/config/domain/tenant-config-override-repository.interface';
import { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

class MemoryConfigRepository implements ConfigRepository {
  readonly items = new Map<string, ConfigItem>();

  constructor(initial: Readonly<Record<string, string>>) {
    for (const [key, value] of Object.entries(initial)) {
      this.items.set(key, createConfigItem(key, value));
    }
  }

  findByKey(key: string): Promise<ConfigItem | null> {
    return Promise.resolve(this.items.get(key) ?? null);
  }

  findAll(): Promise<ConfigItem[]> {
    return Promise.resolve([...this.items.values()]);
  }

  findByGroup(group: string): Promise<ConfigItem[]> {
    return Promise.resolve([...this.items.values()].filter((item) => item.group === group));
  }

  upsert(item: Partial<ConfigItem> & { key: string }): Promise<ConfigItem> {
    const saved = Object.assign(
      this.items.get(item.key) ?? createConfigItem(item.key, item.value ?? ''),
      item,
    );
    this.items.set(saved.key, saved);
    return Promise.resolve(saved);
  }

  async createMissing(items: Array<Partial<ConfigItem> & { key: string }>): Promise<number> {
    let created = 0;
    for (const item of items) {
      if (this.items.has(item.key)) {
        continue;
      }
      await this.upsert(item);
      created += 1;
    }
    return created;
  }

  remove(key: string): Promise<void> {
    this.items.delete(key);
    return Promise.resolve();
  }
}

class MemoryTenantConfigOverrideRepository implements TenantConfigOverrideRepository {
  readonly items = new Map<string, TenantConfigOverride>();

  findByTenantAndKey(tenantId: string, key: string): Promise<TenantConfigOverride | null> {
    return Promise.resolve(this.items.get(this.mapKey(tenantId, key)) ?? null);
  }

  upsert(tenantId: string, key: string, value: string): Promise<void> {
    const item = new TenantConfigOverride();
    item.tenantId = tenantId;
    item.key = key;
    item.value = value;
    this.items.set(this.mapKey(tenantId, key), item);
    return Promise.resolve();
  }

  remove(tenantId: string, key: string): Promise<void> {
    this.items.delete(this.mapKey(tenantId, key));
    return Promise.resolve();
  }

  private mapKey(tenantId: string, key: string): string {
    return `${tenantId}:${key}`;
  }
}

class MemoryRedis {
  readonly values = new Map<string, string>();
  readonly deletedKeys: string[] = [];
  failDelete = false;
  failScan = false;

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  set(key: string, value: string): Promise<'OK'> {
    this.values.set(key, value);
    return Promise.resolve('OK');
  }

  del(...keys: string[]): Promise<number> {
    if (this.failDelete) {
      return Promise.reject(new Error('redis delete unavailable'));
    }
    this.deletedKeys.push(...keys);
    let deleted = 0;
    for (const key of keys) {
      deleted += this.values.delete(key) ? 1 : 0;
    }
    return Promise.resolve(deleted);
  }

  scan(
    _cursor: string,
    _matchKeyword: 'MATCH',
    pattern: string,
    _countKeyword: 'COUNT',
    _count: number,
  ): Promise<[string, string[]]> {
    if (this.failScan) {
      return Promise.reject(new Error('redis scan unavailable'));
    }
    const wildcardIndex = pattern.indexOf('*');
    const prefix = pattern.slice(0, wildcardIndex);
    const suffix = pattern.slice(wildcardIndex + 1);
    const keys = [...this.values.keys()].filter(
      (key) => key.startsWith(prefix) && key.endsWith(suffix),
    );
    return Promise.resolve(['0', keys]);
  }
}

function createConfigItem(key: string, value: string): ConfigItem {
  const item = new ConfigItem();
  item.key = key;
  item.value = value;
  item.type = ConfigValueType.String;
  item.group = ConfigGroup.System;
  item.remark = '';
  item.secret = false;
  return item;
}

function createService(globalValues: Readonly<Record<string, string>>) {
  const globalRepository = new MemoryConfigRepository(globalValues);
  const overrideRepository = new MemoryTenantConfigOverrideRepository();
  const redis = new MemoryRedis();
  const tenant = new TenantContextService();
  const service = new ConfigService(globalRepository, overrideRepository, redis, tenant);
  return { globalRepository, overrideRepository, redis, tenant, service };
}

test('租户覆盖白名单不包含支付或短信配置', () => {
  assert.equal(isTenantOverridableConfigKey(CONFIG_KEYS.system.appName), true);
  assert.equal(isTenantOverridableConfigKey(CONFIG_KEYS.system.appLogo), true);
  assert.equal(isTenantOverridableConfigKey(CONFIG_KEYS.portal.homeBanner), true);
  assert.equal(isTenantOverridableConfigKey(CONFIG_KEYS.portal.showRank), true);
  assert.equal(isTenantOverridableConfigKey(CONFIG_KEYS.auth.userAgreement), true);
  assert.equal(isTenantOverridableConfigKey(CONFIG_KEYS.wallet.alipayPrivateKey), false);
  assert.equal(isTenantOverridableConfigKey(CONFIG_KEYS.sms.provider), false);
});

test('同一配置键按租户读取各自覆盖值，缺少覆盖时回退全局值', async () => {
  const { overrideRepository, service, tenant } = createService({
    [CONFIG_KEYS.system.appName]: '全局品牌',
  });
  await overrideRepository.upsert('tenant-a', CONFIG_KEYS.system.appName, '租户 A');
  await overrideRepository.upsert('tenant-b', CONFIG_KEYS.system.appName, '租户 B');

  const tenantA = await tenant.run({ tenantId: 'tenant-a', isSuper: false }, () =>
    service.getString(CONFIG_KEYS.system.appName, 'fallback'),
  );
  const tenantB = await tenant.run({ tenantId: 'tenant-b', isSuper: false }, () =>
    service.getString(CONFIG_KEYS.system.appName, 'fallback'),
  );
  const tenantC = await tenant.run({ tenantId: 'tenant-c', isSuper: false }, () =>
    service.getString(CONFIG_KEYS.system.appName, 'fallback'),
  );

  assert.equal(tenantA, '租户 A');
  assert.equal(tenantB, '租户 B');
  assert.equal(tenantC, '全局品牌');
});

test('默认租户非超管读取白名单配置时忽略覆盖并回退全局值', async () => {
  const { overrideRepository, service, tenant } = createService({
    [CONFIG_KEYS.system.appName]: '全局品牌',
  });
  await overrideRepository.upsert(DEFAULT_TENANT_ID, CONFIG_KEYS.system.appName, '错误覆盖');

  const value = await tenant.run({ tenantId: DEFAULT_TENANT_ID, isSuper: false }, () =>
    service.getString(CONFIG_KEYS.system.appName, 'fallback'),
  );

  assert.equal(value, '全局品牌');
});

test('租户白名单配置写入覆盖仓储并仅失效当前租户缓存', async () => {
  const { globalRepository, overrideRepository, redis, service, tenant } = createService({
    [CONFIG_KEYS.system.appName]: '全局品牌',
  });

  await tenant.run({ tenantId: 'tenant-a', isSuper: false }, () =>
    service.setRaw(CONFIG_KEYS.system.appName, '租户 A'),
  );

  assert.equal((await globalRepository.findByKey(CONFIG_KEYS.system.appName))?.value, '全局品牌');
  assert.equal(
    (await overrideRepository.findByTenantAndKey('tenant-a', CONFIG_KEYS.system.appName))?.value,
    '租户 A',
  );
  assert.deepEqual(redis.deletedKeys, ['config:v2:tenant:tenant-a:system.appName']);
});

test('平台超管修改租户可覆盖键时写入全局默认值', async () => {
  const { globalRepository, overrideRepository, redis, service, tenant } = createService({
    [CONFIG_KEYS.system.appName]: '旧全局品牌',
  });

  await tenant.run({ tenantId: 'default-tenant', isSuper: true }, () =>
    service.setRaw(CONFIG_KEYS.system.appName, '新全局品牌'),
  );

  assert.equal((await globalRepository.findByKey(CONFIG_KEYS.system.appName))?.value, '新全局品牌');
  assert.equal(
    await overrideRepository.findByTenantAndKey('default-tenant', CONFIG_KEYS.system.appName),
    null,
  );
  assert.deepEqual(redis.deletedKeys, ['config:v2:global:system.appName']);
});

test('平台删除白名单全局配置时清理该键的全部租户缓存', async () => {
  const { globalRepository, redis, service, tenant } = createService({
    [CONFIG_KEYS.system.appName]: '全局品牌',
  });
  const globalKey = 'config:v2:global:system.appName';
  const tenantAKey = 'config:v2:tenant:tenant-a:system.appName';
  const tenantBKey = 'config:v2:tenant:tenant-b:system.appName';
  const unrelatedKey = 'config:v2:tenant:tenant-a:system.appLogo';
  redis.values.set(globalKey, '全局品牌');
  redis.values.set(tenantAKey, '{"overridden":true,"value":"A"}');
  redis.values.set(tenantBKey, '{"overridden":false}');
  redis.values.set(unrelatedKey, '{"overridden":true,"value":"logo"}');

  await tenant.run({ tenantId: DEFAULT_TENANT_ID, isSuper: true }, () =>
    service.remove(CONFIG_KEYS.system.appName),
  );

  assert.equal(await globalRepository.findByKey(CONFIG_KEYS.system.appName), null);
  assert.equal(redis.values.has(globalKey), false);
  assert.equal(redis.values.has(tenantAKey), false);
  assert.equal(redis.values.has(tenantBKey), false);
  assert.equal(redis.values.get(unrelatedKey), '{"overridden":true,"value":"logo"}');
});

test('Redis 删除与扫描均失败时全局配置删除仍成功', async () => {
  const { globalRepository, redis, service, tenant } = createService({
    [CONFIG_KEYS.system.appName]: '全局品牌',
  });
  redis.failDelete = true;
  redis.failScan = true;

  await tenant.run({ tenantId: DEFAULT_TENANT_ID, isSuper: true }, () =>
    service.remove(CONFIG_KEYS.system.appName),
  );

  assert.equal(await globalRepository.findByKey(CONFIG_KEYS.system.appName), null);
});

test('默认租户非超管不能写入白名单配置的全局值', async () => {
  const { globalRepository, service, tenant } = createService({
    [CONFIG_KEYS.system.appName]: '全局品牌',
  });
  const useCase = new UpsertConfigUseCase(globalRepository, service, tenant);

  await tenant.run({ tenantId: DEFAULT_TENANT_ID, isSuper: false }, async () => {
    await assert.rejects(
      useCase.execute({
        key: CONFIG_KEYS.system.appName,
        value: '越权品牌',
        type: ConfigValueType.String,
        group: ConfigGroup.System,
      }),
      ForbiddenException,
    );
  });

  assert.equal((await globalRepository.findByKey(CONFIG_KEYS.system.appName))?.value, '全局品牌');
});

test('默认租户非超管不能通过配置服务写入非白名单全局键', async () => {
  const { globalRepository, service, tenant } = createService({
    [CONFIG_KEYS.sms.provider]: 'log',
  });

  await tenant.run({ tenantId: DEFAULT_TENANT_ID, isSuper: false }, async () => {
    await assert.rejects(service.setRaw(CONFIG_KEYS.sms.provider, 'aliyun'), ForbiddenException);
  });

  assert.equal((await globalRepository.findByKey(CONFIG_KEYS.sms.provider))?.value, 'log');
});

test('默认租户非超管不能删除白名单配置的全局值', async () => {
  const { globalRepository, service, tenant } = createService({
    [CONFIG_KEYS.system.appName]: '全局品牌',
  });
  const useCase = new RemoveConfigUseCase(service, tenant);

  await tenant.run({ tenantId: DEFAULT_TENANT_ID, isSuper: false }, async () => {
    await assert.rejects(useCase.execute(CONFIG_KEYS.system.appName), ForbiddenException);
  });

  assert.equal((await globalRepository.findByKey(CONFIG_KEYS.system.appName))?.value, '全局品牌');
});

test('配置服务内部读取的非白名单配置保持全局存储与全局缓存', async () => {
  const { globalRepository, overrideRepository, redis, service, tenant } = createService({
    [CONFIG_KEYS.sms.provider]: 'log',
  });

  await tenant.run({ tenantId: 'tenant-a', isSuper: false }, () =>
    service.setRaw(CONFIG_KEYS.sms.provider, 'aliyun'),
  );

  assert.equal((await globalRepository.findByKey(CONFIG_KEYS.sms.provider))?.value, 'aliyun');
  assert.equal(
    await overrideRepository.findByTenantAndKey('tenant-a', CONFIG_KEYS.sms.provider),
    null,
  );
  assert.deepEqual(redis.deletedKeys, ['config:v2:global:sms.provider']);
});

test('租户缓存仅记录无覆盖标记，全局回退更新后立即可见', async () => {
  const { service, tenant } = createService({
    [CONFIG_KEYS.system.appName]: '旧全局品牌',
  });

  const before = await tenant.run({ tenantId: 'tenant-a', isSuper: false }, () =>
    service.getString(CONFIG_KEYS.system.appName, 'fallback'),
  );
  await service.setRaw(CONFIG_KEYS.system.appName, '新全局品牌');
  const after = await tenant.run({ tenantId: 'tenant-a', isSuper: false }, () =>
    service.getString(CONFIG_KEYS.system.appName, 'fallback'),
  );

  assert.equal(before, '旧全局品牌');
  assert.equal(after, '新全局品牌');
});

test('证书类密钥即使敏感标记被误关留空保存也不清空并恢复敏感标记', async () => {
  const { globalRepository, service, tenant } = createService({
    [CONFIG_KEYS.wallet.wechatPrivateKey]: '-----BEGIN PRIVATE KEY-----abc',
  });
  const useCase = new UpsertConfigUseCase(globalRepository, service, tenant);

  await tenant.run({ tenantId: DEFAULT_TENANT_ID, isSuper: true }, () =>
    useCase.execute({
      key: CONFIG_KEYS.wallet.wechatPrivateKey,
      value: '',
      type: ConfigValueType.String,
      group: ConfigGroup.Wallet,
      secret: false,
    }),
  );

  const saved = await globalRepository.findByKey(CONFIG_KEYS.wallet.wechatPrivateKey);
  assert.equal(saved?.value, '-----BEGIN PRIVATE KEY-----abc');
  assert.equal(saved?.secret, true);
});

test('租户管理员配置列表只返回可覆盖白名单', async () => {
  const { globalRepository, service, tenant } = createService({
    [CONFIG_KEYS.system.appName]: '品牌',
    [CONFIG_KEYS.sms.provider]: 'log',
  });
  const useCase = new ListConfigsUseCase(globalRepository, service, tenant);

  const result = await tenant.run({ tenantId: 'tenant-a', isSuper: false }, () =>
    useCase.execute(),
  );

  assert.deepEqual(
    result.map((item) => item.key),
    [CONFIG_KEYS.system.appName],
  );
});

test('租户管理员不能通过配置管理用例修改或删除全局键', async () => {
  const { globalRepository, service, tenant } = createService({
    [CONFIG_KEYS.sms.provider]: 'log',
  });
  const upsert = new UpsertConfigUseCase(globalRepository, service, tenant);
  const remove = new RemoveConfigUseCase(service, tenant);

  await tenant.run({ tenantId: 'tenant-a', isSuper: false }, async () => {
    await assert.rejects(
      upsert.execute({
        key: CONFIG_KEYS.sms.provider,
        value: 'aliyun',
        type: ConfigValueType.String,
        group: ConfigGroup.Sms,
      }),
      ForbiddenException,
    );
    await assert.rejects(remove.execute(CONFIG_KEYS.sms.provider), ForbiddenException);
  });

  assert.equal((await globalRepository.findByKey(CONFIG_KEYS.sms.provider))?.value, 'log');
});
