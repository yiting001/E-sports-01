import { TenantConfigOverride } from './tenant-config-override.entity';

export const TENANT_CONFIG_OVERRIDE_REPOSITORY = Symbol('TENANT_CONFIG_OVERRIDE_REPOSITORY');

/** 租户配置覆盖仓储端口，所有方法必须显式携带租户主键。 */
export interface TenantConfigOverrideRepository {
  findByTenantAndKey(tenantId: string, key: string): Promise<TenantConfigOverride | null>;
  upsert(tenantId: string, key: string, value: string): Promise<void>;
  remove(tenantId: string, key: string): Promise<void>;
}
