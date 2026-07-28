import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configApi } from './config.api';
import { http } from './http';

vi.mock('./http', () => ({
  http: { get: vi.fn() },
}));

describe('C 端公开租户配置探针', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('品牌与门户请求显式启用租户入口探针', async () => {
    await configApi.branding();
    await configApi.portal();

    expect(http.get).toHaveBeenNthCalledWith(1, '/config/branding', {
      tenantEntryProbe: true,
    });
    expect(http.get).toHaveBeenNthCalledWith(2, '/config/portal', {
      tenantEntryProbe: true,
    });
  });
});
