import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserStatusEnum } from '@app/contracts';
import { userApi } from './user.api';
import { http } from './http';

vi.mock('./http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('用户管理 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('列表请求携带搜索筛选参数', async () => {
    await userApi.list(2, 20, {
      keyword: 'alice',
      status: UserStatusEnum.Enabled,
      roleId: 'role-a',
    });

    expect(http.get).toHaveBeenCalledWith('/rbac/users', {
      params: {
        page: 2,
        pageSize: 20,
        keyword: 'alice',
        status: UserStatusEnum.Enabled,
        roleId: 'role-a',
      },
    });
  });

  it('重置密码使用独立受权限保护端点', async () => {
    await userApi.resetPassword('user-a', { password: 'new-password' });

    expect(http.post).toHaveBeenCalledWith('/rbac/users/user-a/password/reset', {
      password: 'new-password',
    });
  });
});
