import { RoleView } from '@app/contracts';
import { Role } from '../domain/role.entity';

/** 领域角色实体 → 对外视图 */
export function toRoleView(role: Role): RoleView {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    remark: role.remark,
    permissionIds: (role.permissions ?? []).map((p) => p.id),
    createdAt: role.createdAt.toISOString(),
  };
}
