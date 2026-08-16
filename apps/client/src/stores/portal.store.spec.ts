import type { PortalConfigView } from '@app/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configApi } from '@/api/config.api';
import { usePortalStore } from './portal.store';

vi.mock('@/api/config.api', () => ({
  configApi: { portal: vi.fn() },
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

describe('C 端门户配置租户切换', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('丢弃上一租户的晚到响应', async () => {
    const first = deferred<PortalConfigView>();
    const second = deferred<PortalConfigView>();
    vi.mocked(configApi.portal).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const store = usePortalStore();

    const firstLoad = store.load();
    const secondLoad = store.load();
    second.resolve({
      showRank: false,
      vConsoleEnabled: true,
      voiceNotifyEnabled: false,
      smsLoginEnabled: false,
      wechatOfficialLoginEnabled: true,
      wechatJsapiPayEnabled: true,
    });
    await secondLoad;
    first.resolve({
      showRank: true,
      vConsoleEnabled: false,
      voiceNotifyEnabled: true,
      smsLoginEnabled: true,
      wechatOfficialLoginEnabled: false,
      wechatJsapiPayEnabled: false,
    });
    await firstLoad;

    expect(store.showRank).toBe(false);
    expect(store.vConsoleEnabled).toBe(true);
    expect(store.voiceNotifyEnabled).toBe(false);
    expect(store.smsLoginEnabled).toBe(false);
    expect(store.wechatOfficialLoginEnabled).toBe(true);
    expect(store.wechatJsapiPayEnabled).toBe(true);
    expect(store.loaded).toBe(true);
  });
});
