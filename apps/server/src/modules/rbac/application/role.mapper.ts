import { DEFAULT_TENANT_ID, RoleView } from '@app/contracts';
import { Role } from '../domain/role.entity';
import { RESERVED_ROLE_CODE_SET, SUPER_ADMIN_ROLE } from '../domain/rbac.constants';

/** 平台超管角色（默认租户的 admin）是鉴权旁路的唯一依据，删除会锁死平台 */
export function isPlatformSuperRole(role: Pick<Role, 'code' | 'tenantId'>): boolean {
  return role.code === SUPER_ADMIN_ROLE && role.tenantId === DEFAULT_TENANT_ID;
}

/** 领域角色实体 → 对外视图 */
export function toRoleView(role: Role): RoleView {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    remark: role.remark,
    tenantId: role.tenantId,
    permissionIds: (role.permissions ?? []).map((p) => p.id),
    isSuper: role.code === SUPER_ADMIN_ROLE,
    isBuiltin: RESERVED_ROLE_CODE_SET.has(role.code),
    deletable: !isPlatformSuperRole(role),
    deletedAt: role.deletedAt ? role.deletedAt.toISOString() : null,
    createdAt: role.createdAt.toISOString(),
  };
}
