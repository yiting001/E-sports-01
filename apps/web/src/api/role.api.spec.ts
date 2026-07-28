import { beforeEach, describe, expect, it, vi } from 'vitest';
import { roleApi } from './role.api';
import { http } from './http';

vi.mock('./http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('角色可授予权限 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('使用独立租户安全目录，不访问平台权限管理目录', async () => {
    await roleApi.grantablePermissions();

    expect(http.get).toHaveBeenCalledWith('/rbac/roles/grantable-permissions');
  });
});
