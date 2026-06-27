import { TenantStatus, TenantView } from '@app/contracts';
import { TenantEntity } from '../domain/tenant.entity';

/** 租户实体 → 对外视图 */
export function toTenantView(tenant: TenantEntity): TenantView {
  return {
    id: tenant.id,
    code: tenant.code,
    name: tenant.name,
    status: tenant.status as TenantStatus,
    remark: tenant.remark,
    builtin: tenant.builtin,
    createdAt: tenant.createdAt.toISOString(),
  };
}
