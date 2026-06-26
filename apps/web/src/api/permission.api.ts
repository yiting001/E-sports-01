import type { PermissionNode, PermissionType } from '@app/contracts';
import { http } from './http';

/** 新建权限入参 */
export interface CreatePermissionBody {
  parentId?: string | null;
  code: string;
  name: string;
  type: PermissionType;
  path?: string | null;
  component?: string | null;
  apiMethod?: string | null;
  apiPath?: string | null;
  icon?: string | null;
  sort?: number;
}

/** 权限管理接口（权限以树形结构返回） */
export const permissionApi = {
  tree(): Promise<PermissionNode[]> {
    return http.get('/rbac/permissions');
  },
  create(body: CreatePermissionBody): Promise<PermissionNode> {
    return http.post('/rbac/permissions', body);
  },
  update(id: string, body: Partial<CreatePermissionBody>): Promise<PermissionNode> {
    return http.patch(`/rbac/permissions/${id}`, body);
  },
  remove(id: string): Promise<void> {
    return http.delete(`/rbac/permissions/${id}`);
  },
};
