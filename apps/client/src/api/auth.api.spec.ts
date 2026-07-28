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

describe('C 端鉴权 API 租户上下文', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContext.setCode('tenant-one');
  });

  it('发码、登录和注册都使用当前租户编码', async () => {
    await authApi.sendLoginCode({ phone: '13800000000' });
    await authApi.sendRegisterCode({ phone: '13800000000' });
    await authApi.smsLogin({ phone: '13800000000', code: '000000' });
    await authApi.smsRegister({ phone: '13800000000', code: '000000', nickname: '用户' });

    expect(http.post).toHaveBeenNthCalledWith(1, '/auth/sms/code', {
      phone: '13800000000',
      tenantCode: 'tenant-one',
    });
    expect(http.post).toHaveBeenNthCalledWith(2, '/auth/sms/register-code', {
      phone: '13800000000',
      tenantCode: 'tenant-one',
    });
    expect(http.post).toHaveBeenNthCalledWith(3, '/auth/sms/login', {
      phone: '13800000000',
      code: '000000',
      tenantCode: 'tenant-one',
    });
    expect(http.post).toHaveBeenNthCalledWith(4, '/auth/sms/register', {
      phone: '13800000000',
      code: '000000',
      nickname: '用户',
      tenantCode: 'tenant-one',
    });
  });
});
