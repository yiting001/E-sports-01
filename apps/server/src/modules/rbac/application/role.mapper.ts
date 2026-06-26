import { RoleView } from '@app/contracts';
import { Role } from '../domain/role.entity';
import { SUPER_ADMIN_ROLE } from '../domain/rbac.constants';

/** 领域角色实体 → 对外视图 */
export function toRoleView(role: Role): RoleView {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    remark: role.remark,
    permissionIds: (role.permissions ?? []).map((p) => p.id),
    isSuper: role.code === SUPER_ADMIN_ROLE,
    createdAt: role.createdAt.toISOString(),
  };
}
