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

describe('角色列表 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('不带筛选时只传分页参数，空字符串不会作为筛选条件发出', async () => {
    await roleApi.list(1, 20, { keyword: '', code: '' });

    expect(http.get).toHaveBeenCalledWith('/rbac/roles', {
      params: { page: 1, pageSize: 20, keyword: undefined, code: undefined, kind: undefined },
    });
  });

  it('已删除分类透传 kind=deleted，恢复走独立 restore 接口', async () => {
    await roleApi.list(1, 20, { kind: 'deleted' });
    await roleApi.restore('role-1');

    expect(http.get).toHaveBeenCalledWith('/rbac/roles', {
      params: { page: 1, pageSize: 20, keyword: undefined, code: undefined, kind: 'deleted' },
    });
    expect(http.post).toHaveBeenCalledWith('/rbac/roles/role-1/restore');
  });

  it('名称搜索、编码精确筛选与分类透传到查询参数', async () => {
    await roleApi.list(2, 10, { keyword: '客服', code: 'service', kind: 'builtin' });

    expect(http.get).toHaveBeenCalledWith('/rbac/roles', {
      params: { page: 2, pageSize: 10, keyword: '客服', code: 'service', kind: 'builtin' },
    });
  });
});
