import type { PaginatedResult, PermissionNode, RoleView } from '@app/contracts';
import { http } from './http';

/** 新建角色入参 */
export interface CreateRoleBody {
  code: string;
  name: string;
  remark?: string;
  /** 所属租户主键；仅平台超管可指定，缺省为当前租户 */
  tenantId?: string;
}

/** 更新角色入参 */
export interface UpdateRoleBody {
  name?: string;
  remark?: string;
}

/** 角色管理接口 */
export const roleApi = {
  list(page: number, pageSize: number): Promise<PaginatedResult<RoleView>> {
    return http.get('/rbac/roles', { params: { page, pageSize } });
  },
  grantablePermissions(): Promise<PermissionNode[]> {
    return http.get('/rbac/roles/grantable-permissions');
  },
  create(body: CreateRoleBody): Promise<RoleView> {
    return http.post('/rbac/roles', body);
  },
  update(id: string, body: UpdateRoleBody): Promise<RoleView> {
    return http.patch(`/rbac/roles/${id}`, body);
  },
  remove(id: string): Promise<void> {
    return http.delete(`/rbac/roles/${id}`);
  },
  assignPermissions(id: string, permissionIds: string[]): Promise<void> {
    return http.post(`/rbac/roles/${id}/permissions`, { permissionIds });
  },
};
