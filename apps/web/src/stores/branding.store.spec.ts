import type { BrandingView } from '@app/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configApi } from '@/api/config.api';
import { TenantEntryStatus, tenantContext } from '@/tenant/tenant-context';
import { useBrandingStore } from './branding.store';

vi.mock('@/api/config.api', () => ({
  configApi: { branding: vi.fn() },
}));

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('管理端品牌租户切换', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    tenantContext.setCode('default');
    tenantContext.setCode('tenant-one');
  });

  it('丢弃上一租户的晚到响应', async () => {
    const first = deferred<BrandingView>();
    const second = deferred<BrandingView>();
    vi.mocked(configApi.branding)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const store = useBrandingStore();

    const firstLoad = store.load();
    const secondLoad = store.load();
    second.resolve({ appName: '租户二', appLogo: '/tenant-two.png' });
    await secondLoad;
    first.resolve({ appName: '租户一', appLogo: '/tenant-one.png' });
    await firstLoad;

    expect(store.appName).toBe('租户二');
    expect(store.appLogo).toBe('/tenant-two.png');
  });

  it('普通品牌请求失败时使用默认品牌并放行租户入口', async () => {
    vi.mocked(configApi.branding).mockRejectedValue(new Error('network down'));
    const store = useBrandingStore();

    expect(tenantContext.entryStatus.value).toBe(TenantEntryStatus.Validating);
    await store.load();

    expect(tenantContext.entryStatus.value).toBe(TenantEntryStatus.Ready);
    expect(tenantContext.entryError.value).toBeNull();
  });

  it('租户明确被拒绝后不被品牌降级重新放行', async () => {
    const tenantCode = tenantContext.getCode();
    const tenantRevision = tenantContext.revision.value;
    vi.mocked(configApi.branding).mockImplementation(async () => {
      tenantContext.rejectCurrent(tenantCode, tenantRevision);
      throw new Error('租户不存在或已停用');
    });
    const store = useBrandingStore();

    await store.load();

    expect(tenantContext.entryStatus.value).toBe(TenantEntryStatus.Rejected);
    expect(tenantContext.entryError.value).toContain('租户不存在或已停用');
  });
});
