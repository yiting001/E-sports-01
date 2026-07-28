import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configApi } from './config.api';
import { http } from './http';

vi.mock('./http', () => ({
  http: { get: vi.fn() },
}));

describe('管理端公开租户配置探针', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('品牌请求静默且显式启用租户入口探针', async () => {
    await configApi.branding();

    expect(http.get).toHaveBeenCalledWith('/config/branding', {
      silent: true,
      tenantEntryProbe: true,
    });
  });
});
