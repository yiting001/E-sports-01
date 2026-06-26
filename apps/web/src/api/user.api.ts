import type { PaginatedResult, UserView } from '@app/contracts';
import { PAGINATION_DEFAULTS } from '@app/contracts';
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
  /** 拉取全部用户（按最大页大小逐页累加），供成员选择器等需要全量列表的场景使用 */
  async listAll(): Promise<UserView[]> {
    const size = PAGINATION_DEFAULTS.maxPageSize;
    const all: UserView[] = [];
    let page = 1;
    for (;;) {
      const res = await this.list(page, size);
      all.push(...res.list);
      if (all.length >= res.total || res.list.length === 0) {
        break;
      }
      page += 1;
    }
    return all;
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
