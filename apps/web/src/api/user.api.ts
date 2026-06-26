import type { PaginatedResult, UserView } from '@app/contracts';
import { http } from './http';

/** 创建用户入参 */
export interface CreateUserBody {
  username: string;
  password: string;
  nickname?: string;
}

/** 更新用户入参 */
export interface UpdateUserBody {
  nickname?: string;
  status?: string;
}

/** 用户管理接口 */
export const userApi = {
  list(page: number, pageSize: number): Promise<PaginatedResult<UserView>> {
    return http.get('/rbac/users', { params: { page, pageSize } });
  },
  create(body: CreateUserBody): Promise<UserView> {
    return http.post('/rbac/users', body);
  },
  update(id: string, body: UpdateUserBody): Promise<UserView> {
    return http.patch(`/rbac/users/${id}`, body);
  },
  remove(id: string): Promise<void> {
    return http.delete(`/rbac/users/${id}`);
  },
  assignRoles(id: string, roleIds: string[]): Promise<void> {
    return http.post(`/rbac/users/${id}/roles`, { roleIds });
  },
};
