import type { AuthProfile } from '@app/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/api/auth.api';
import { StaleTenantRequestError } from '@/api/http';
import { tokenStorage } from '@/api/token-storage';
import { tenantContext } from '@/tenant/tenant-context';
import { useAuthStore } from './auth.store';

vi.mock('@/api/auth.api', () => ({
  authApi: {
    profile: vi.fn(),
    smsLogin: vi.fn(),
    smsRegister: vi.fn(),
  },
}));
vi.mock('@/api/token-storage', () => ({
  tokenStorage: {
    clear: vi.fn(),
    getAccess: vi.fn(() => 'access-token'),
    onChange: vi.fn(),
    save: vi.fn(),
  },
}));

const OTHER_TENANT_PROFILE: AuthProfile = {
  id: 'user-1',
  username: 'member',
  nickname: '用户',
  avatar: '',
  phone: '13800000000',
  roles: ['member'],
  permissions: [],
  isSuper: false,
  tenantCode: 'tenant-two',
  tenantName: '租户二',
};

describe('C 端鉴权租户校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    tenantContext.setCode('tenant-one');
  });

  it('档案租户与当前站点不一致时清理当前租户会话', async () => {
    vi.mocked(authApi.profile).mockResolvedValue(OTHER_TENANT_PROFILE);
    const store = useAuthStore();

    await expect(store.loadProfile()).rejects.toThrow(
      'TENANT_PROFILE_MISMATCH'
    );

    expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
    expect(store.profile).toBeNull();
    expect(store.loaded).toBe(false);
  });

  it('旧租户档案请求被取消时不清理当前租户令牌', async () => {
    vi.mocked(authApi.profile).mockRejectedValue(new StaleTenantRequestError());
    const store = useAuthStore();

    await expect(store.loadProfile()).rejects.toBeInstanceOf(
      StaleTenantRequestError
    );

    expect(tokenStorage.clear).not.toHaveBeenCalled();
    expect(store.isAuthenticated).toBe(true);
  });
});
