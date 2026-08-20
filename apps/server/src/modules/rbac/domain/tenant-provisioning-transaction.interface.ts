import type { PermissionRepository } from './permission-repository.interface';
import type { RoleRepository } from './role-repository.interface';
import type { TenantRepository } from './tenant-repository.interface';

export const TENANT_PROVISIONING_TRANSACTION = Symbol('TENANT_PROVISIONING_TRANSACTION');

/** 租户开通事务内允许使用的最小仓储集合。 */
export interface TenantProvisioningRepositories {
  tenants: Pick<TenantRepository, 'existsByCode' | 'create' | 'save'>;
  roles: Pick<RoleRepository, 'create' | 'save'>;
  permissions: Pick<PermissionRepository, 'findAll'>;
}

/** 确保租户与内置角色原子创建。 */
export interface TenantProvisioningTransaction {
  run<T>(work: (repositories: TenantProvisioningRepositories) => Promise<T>): Promise<T>;
}
