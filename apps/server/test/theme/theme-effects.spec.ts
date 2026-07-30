import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_TENANT_ID,
  sanitizeThemeEffects,
  ThemeEffect,
} from '@app/contracts';
import { GetPublicThemeEffectsUseCase } from '../../src/modules/theme/application/use-cases/get-public-theme-effects.usecase';
import { UpdateThemeEffectsUseCase } from '../../src/modules/theme/application/use-cases/update-theme-effects.usecase';
import { toThemeEffectsView } from '../../src/modules/theme/application/theme.mapper';
import { ThemeSettingEntity } from '../../src/modules/theme/domain/theme-setting.entity';
import type { ThemeSettingRepository } from '../../src/modules/theme/domain/theme-setting-repository.interface';
import type { TenantResolver } from '../../src/modules/rbac/application/tenant-resolver.service';

function createSetting(effects: string): ThemeSettingEntity {
  return Object.assign(new ThemeSettingEntity(), {
    id: 'setting-id',
    tenantId: 'tenant-a',
    effects,
  });
}

void test('sanitizeThemeEffects 过滤非法值并去重', () => {
  assert.deepEqual(
    sanitizeThemeEffects(['clouds', 'hack', 'clouds', 'laser', 42, null]),
    [ThemeEffect.Clouds, ThemeEffect.Laser],
  );
  assert.deepEqual(sanitizeThemeEffects('not-array'), []);
});

void test('toThemeEffectsView 配置缺失或 JSON 损坏时安全回退为空列表', () => {
  assert.deepEqual(toThemeEffectsView(null), { effects: [] });
  assert.deepEqual(toThemeEffectsView(createSetting('{bad json')), {
    effects: [],
  });
  assert.deepEqual(toThemeEffectsView(createSetting('["blaze","grid"]')), {
    effects: [ThemeEffect.Blaze, ThemeEffect.Grid],
  });
});

void test('公开接口租户编码缺省时按内置默认租户查询', async () => {
  const queriedTenantIds: string[] = [];
  const repo = {
    findByTenantId: async (tenantId: string) => {
      queriedTenantIds.push(tenantId);
      return createSetting('["laser"]');
    },
  } as unknown as ThemeSettingRepository;
  const tenantResolver = {
    resolveOptionalId: async () => undefined,
  } as unknown as TenantResolver;

  const view = await new GetPublicThemeEffectsUseCase(
    repo,
    tenantResolver,
  ).execute();

  assert.deepEqual(queriedTenantIds, [DEFAULT_TENANT_ID]);
  assert.deepEqual(view.effects, [ThemeEffect.Laser]);
});

void test('公开接口指定租户编码时只查询该租户配置', async () => {
  const queriedTenantIds: string[] = [];
  const repo = {
    findByTenantId: async (tenantId: string) => {
      queriedTenantIds.push(tenantId);
      return null;
    },
  } as unknown as ThemeSettingRepository;
  const tenantResolver = {
    resolveOptionalId: async () => 'tenant-a',
  } as unknown as TenantResolver;

  const view = await new GetPublicThemeEffectsUseCase(
    repo,
    tenantResolver,
  ).execute('a');

  assert.deepEqual(queriedTenantIds, ['tenant-a']);
  assert.deepEqual(view.effects, []);
});

void test('更新用例整量覆盖并持久化清洗后的列表', async () => {
  const savedEntities: ThemeSettingEntity[] = [];
  const repo = {
    findCurrent: async () => null,
    create: (data: Partial<ThemeSettingEntity>) =>
      Object.assign(new ThemeSettingEntity(), data),
    save: async (entity: ThemeSettingEntity) => {
      savedEntities.push(entity);
      return entity;
    },
  } as unknown as ThemeSettingRepository;

  const view = await new UpdateThemeEffectsUseCase(repo).execute([
    ThemeEffect.Grid,
    ThemeEffect.Grid,
    'bad' as ThemeEffect,
  ]);

  assert.deepEqual(view.effects, [ThemeEffect.Grid]);
  assert.equal(savedEntities[0]?.effects, '["grid"]');
});
