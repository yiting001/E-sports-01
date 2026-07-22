import type { MemberMineView } from '@app/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memberApi } from '@/api/member.api';
import { useMemberStore } from './member.store';

vi.mock('@/api/member.api', () => ({
  memberApi: {
    mine: vi.fn(),
  },
}));

const levelThreeMine: MemberMineView = {
  level: 3,
  levelName: '黄金会员',
  discountBp: 9500,
  spendFen: 50000,
  spendYuan: '500.00',
  nextLevelName: '钻石会员',
  nextNeedFen: 150000,
};

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('member store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(memberApi.mine).mockReset();
  });

  it('发布服务端返回的真实会员等级', async () => {
    vi.mocked(memberApi.mine).mockResolvedValue(levelThreeMine);
    const store = useMemberStore();

    await store.refresh();

    expect(store.mine).toEqual(levelThreeMine);
    expect(store.mine?.level).toBe(3);
    expect(store.loading).toBe(false);
    expect(store.loadError).toBe(false);
  });

  it('加载失败时不伪造默认等级并允许重试', async () => {
    vi.mocked(memberApi.mine)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(levelThreeMine);
    const store = useMemberStore();

    await store.refresh();
    expect(store.mine).toBeNull();
    expect(store.loadError).toBe(true);

    await store.refresh();
    expect(store.mine?.level).toBe(3);
    expect(store.loadError).toBe(false);
  });

  it('已有等级刷新失败时保留快照并公开失败状态', async () => {
    vi.mocked(memberApi.mine)
      .mockResolvedValueOnce(levelThreeMine)
      .mockRejectedValueOnce(new Error('temporary failure'));
    const store = useMemberStore();

    await store.refresh();
    await store.refresh();

    expect(store.mine?.level).toBe(3);
    expect(store.loadError).toBe(true);
    expect(store.loading).toBe(false);
  });

  it('重置会话后忽略旧账号的晚到响应', async () => {
    const pending = deferred<MemberMineView>();
    vi.mocked(memberApi.mine).mockReturnValue(pending.promise);
    const store = useMemberStore();

    const refresh = store.refresh();
    expect(store.loading).toBe(true);
    store.reset();
    pending.resolve(levelThreeMine);
    await refresh;

    expect(store.mine).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.loadError).toBe(false);
  });
});
