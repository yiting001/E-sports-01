import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tenantContext } from '@/tenant/tenant-context';
import { authApi } from './auth.api';
import { http } from './http';

vi.mock('./http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('管理端鉴权 API 租户上下文', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContext.setCode('tenant-one');
  });

  it('账号、短信与注册请求都使用当前租户编码', async () => {
    await authApi.login({ account: 'admin', password: 'password' });
    await authApi.register({ username: 'member', password: 'password' });
    await authApi.sendSmsCode({ phone: '13800000000' });
    await authApi.smsLogin({ phone: '13800000000', code: '000000' });

    expect(http.post).toHaveBeenNthCalledWith(1, '/auth/login', {
      account: 'admin',
      password: 'password',
      tenantCode: 'tenant-one',
    });
    expect(http.post).toHaveBeenNthCalledWith(2, '/auth/register', {
      username: 'member',
      password: 'password',
      tenantCode: 'tenant-one',
    });
    expect(http.post).toHaveBeenNthCalledWith(3, '/auth/sms/code', {
      phone: '13800000000',
      tenantCode: 'tenant-one',
    });
    expect(http.post).toHaveBeenNthCalledWith(4, '/auth/sms/login', {
      phone: '13800000000',
      code: '000000',
      tenantCode: 'tenant-one',
    });
  });
});
