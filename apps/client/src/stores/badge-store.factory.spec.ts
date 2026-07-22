import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineBadgeStore } from './badge-store.factory';

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

let storeSequence = 0;

function createStore(fetchTotal: () => Promise<number>) {
  const useStore = defineBadgeStore(`badge-test-${++storeSequence}`, fetchTotal);
  return useStore();
}

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('defineBadgeStore', () => {
  it('刷新失败时保留最后一次有效数量', async () => {
    const fetchTotal = vi
      .fn<() => Promise<number>>()
      .mockResolvedValueOnce(4)
      .mockRejectedValueOnce(new Error('temporary failure'));
    const store = createStore(fetchTotal);

    await store.refresh();
    await store.refresh();

    expect(store.total).toBe(4);
  });

  it('突发刷新合并为单飞与一轮尾随，旧响应不能覆盖新结果', async () => {
    const first = deferred<number>();
    const second = deferred<number>();
    const fetchTotal = vi
      .fn<() => Promise<number>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const store = createStore(fetchTotal);

    const oldRefresh = store.refresh();
    const latestRefresh = store.refresh();
    expect(fetchTotal).toHaveBeenCalledTimes(1);

    first.resolve(99);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchTotal).toHaveBeenCalledTimes(2);

    second.resolve(2);
    await Promise.all([oldRefresh, latestRefresh]);
    expect(store.total).toBe(2);
  });

  it('页面本地同步会废弃在途旧响应', async () => {
    const pending = deferred<number>();
    const store = createStore(vi.fn(() => pending.promise));

    const refresh = store.refresh();
    store.setTotal(3);
    pending.resolve(99);
    await refresh;

    expect(store.total).toBe(3);
  });

  it('重复启动只保留一个轮询定时器，停止后完整清理', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      clearInterval: globalThis.clearInterval,
      setInterval: globalThis.setInterval,
    });
    const store = createStore(vi.fn().mockResolvedValue(1));

    store.startPolling();
    store.startPolling();
    expect(vi.getTimerCount()).toBe(1);

    store.stopPolling();
    expect(vi.getTimerCount()).toBe(0);
  });
});
