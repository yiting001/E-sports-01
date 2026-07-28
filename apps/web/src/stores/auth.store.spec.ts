import type { AuthProfile } from '@app/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/api/auth.api';
import { tokenStorage } from '@/api/token-storage';
import { tenantContext } from '@/tenant/tenant-context';
import { useAuthStore } from './auth.store';

vi.mock('@/api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    profile: vi.fn(),
    register: vi.fn(),
    smsLogin: vi.fn(),
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
  username: 'admin',
  nickname: '管理员',
  avatar: '',
  phone: '13800000000',
  roles: ['tenant_admin'],
  permissions: [],
  isSuper: false,
  tenantCode: 'tenant-two',
  tenantName: '租户二',
};

describe('管理端鉴权租户校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    tenantContext.setCode('tenant-one');
  });

  it('档案租户与当前站点不一致时清理当前租户会话', async () => {
    vi.mocked(authApi.profile).mockResolvedValue(OTHER_TENANT_PROFILE);
    const store = useAuthStore();

    await expect(store.loadProfile()).rejects.toThrow('TENANT_PROFILE_MISMATCH');

    expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
    expect(store.profile).toBeNull();
    expect(store.loaded).toBe(false);
  });
});
