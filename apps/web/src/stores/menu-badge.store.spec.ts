import type { AuthProfile, ConversationView, MenuView } from "@app/contracts";
import {
  BoosterStatus,
  ConversationMemberRole,
  ConversationStatus,
  ConversationType,
  OrderStatus,
  PERMS,
  RealnameStatus,
} from "@app/contracts";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { useMenuStore } from "@/stores/menu.store";
import { MENU_BADGE_CODES, useMenuBadgeStore } from "@/stores/menu-badge.store";

const apiMocks = vi.hoisted(() => ({
  boosterList: vi.fn(),
  conversationList: vi.fn(),
  orderList: vi.fn(),
  realnameList: vi.fn(),
  serviceQueue: vi.fn(),
}));

vi.mock("@/api/booster.api", () => ({
  boosterApi: { list: apiMocks.boosterList },
}));
vi.mock("@/api/im.api", () => ({
  imApi: {
    listConversations: apiMocks.conversationList,
    serviceQueue: apiMocks.serviceQueue,
  },
}));
vi.mock("@/api/order.api", () => ({
  orderApi: { list: apiMocks.orderList },
}));
vi.mock("@/api/realname.api", () => ({
  realnameApi: { list: apiMocks.realnameList },
}));

const ALL_PERMISSIONS = [
  PERMS.realname.list,
  PERMS.order.list,
  PERMS.booster.list,
  PERMS.im.serviceAgent,
];

function pageResult(total: number) {
  return { list: [], total, page: 1, pageSize: 1 };
}

function profile(permissions: string[]): AuthProfile {
  return {
    id: "user-1",
    username: "operator",
    nickname: "客服",
    avatar: "",
    phone: "",
    roles: ["service"],
    permissions,
    isSuper: false,
    tenantCode: "tenant-1",
    tenantName: "租户一",
  };
}

function visibleMenus(): MenuView[] {
  return Object.values(MENU_BADGE_CODES).map((code, index) => ({
    code,
    title: code,
    path: code,
    sort: index,
  }));
}

function conversation(
  id: string,
  unread: number,
  type = ConversationType.Private,
  viewerRole = ConversationMemberRole.Member
): ConversationView {
  return {
    id,
    version: 1,
    type,
    viewerRole,
    title: id,
    ownerId: null,
    status: ConversationStatus.Active,
    memberCount: 2,
    lastMessage: null,
    unread,
    createdAt: 1,
    updatedAt: 1,
  };
}

function prepareStore(permissions = ALL_PERMISSIONS) {
  setActivePinia(createPinia());
  const auth = useAuthStore();
  auth.profile = profile(permissions);
  const menus = useMenuStore();
  menus.menus = visibleMenus();
  return { auth, badges: useMenuBadgeStore(), menus };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

beforeEach(() => {
  for (const mock of Object.values(apiMocks)) {
    mock.mockReset();
  }
  apiMocks.realnameList.mockResolvedValue(pageResult(0));
  apiMocks.orderList.mockResolvedValue(pageResult(0));
  apiMocks.boosterList.mockResolvedValue(pageResult(0));
  apiMocks.conversationList.mockResolvedValue([]);
  apiMocks.serviceQueue.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useMenuBadgeStore", () => {
  it("复用五类业务接口并写入对应菜单角标", async () => {
    apiMocks.realnameList.mockResolvedValue(pageResult(2));
    apiMocks.orderList.mockResolvedValue(pageResult(3));
    apiMocks.boosterList.mockResolvedValue(pageResult(4));
    apiMocks.conversationList.mockResolvedValue([
      conversation("conversation-1", 5),
      conversation(
        "agent-service-conversation-1",
        6,
        ConversationType.Service,
        ConversationMemberRole.Agent
      ),
      conversation(
        "visitor-service-conversation-1",
        7,
        ConversationType.Service,
        ConversationMemberRole.Owner
      ),
    ]);
    apiMocks.serviceQueue.mockResolvedValue([
      { conversationId: "service-1" },
      { conversationId: "service-2" },
    ]);
    const { badges } = prepareStore();

    await badges.refresh();

    expect(badges.counts).toEqual({
      [MENU_BADGE_CODES.realname]: 2,
      [MENU_BADGE_CODES.order]: 3,
      [MENU_BADGE_CODES.booster]: 4,
      [MENU_BADGE_CODES.im]: 12,
      [MENU_BADGE_CODES.service]: 8,
    });
    expect(apiMocks.realnameList).toHaveBeenCalledWith(
      1,
      1,
      RealnameStatus.Pending,
      { silent: true }
    );
    expect(apiMocks.orderList).toHaveBeenCalledWith(
      1,
      1,
      OrderStatus.PendingService,
      undefined,
      { silent: true }
    );
    expect(apiMocks.boosterList).toHaveBeenCalledWith(
      1,
      1,
      BoosterStatus.Pending,
      undefined,
      { silent: true }
    );
    expect(apiMocks.conversationList).toHaveBeenCalledWith({ silent: true });
    expect(apiMocks.serviceQueue).toHaveBeenCalledWith({ silent: true });
  });

  it("菜单或 API 权限不足时清零且不请求受限数据", async () => {
    apiMocks.realnameList.mockResolvedValue(pageResult(2));
    apiMocks.orderList.mockResolvedValue(pageResult(3));
    apiMocks.boosterList.mockResolvedValue(pageResult(4));
    apiMocks.conversationList.mockResolvedValue([
      conversation("conversation-1", 5),
      conversation(
        "agent-service-conversation-1",
        6,
        ConversationType.Service,
        ConversationMemberRole.Agent
      ),
    ]);
    apiMocks.serviceQueue.mockResolvedValue([{ conversationId: "service-1" }]);
    const { auth, badges, menus } = prepareStore();
    await badges.refresh();
    expect(Object.values(badges.counts)).toEqual([3, 4, 2, 5, 7]);

    for (const mock of Object.values(apiMocks)) {
      mock.mockClear();
    }
    auth.profile = profile([]);
    menus.menus = menus.menus.filter(
      (menu) => menu.code !== MENU_BADGE_CODES.im
    );

    await badges.refresh();

    expect(apiMocks.realnameList).not.toHaveBeenCalled();
    expect(apiMocks.orderList).not.toHaveBeenCalled();
    expect(apiMocks.boosterList).not.toHaveBeenCalled();
    expect(apiMocks.conversationList).not.toHaveBeenCalled();
    expect(apiMocks.serviceQueue).not.toHaveBeenCalled();
    expect(Object.values(badges.counts)).toEqual([0, 0, 0, 0, 0]);
  });

  it("单项失败保留上次成功值，其他角标继续更新并记录重试状态", async () => {
    apiMocks.realnameList.mockResolvedValue(pageResult(7));
    apiMocks.orderList.mockResolvedValue(pageResult(8));
    const { badges } = prepareStore();
    await badges.refresh([MENU_BADGE_CODES.realname, MENU_BADGE_CODES.order]);

    apiMocks.realnameList.mockRejectedValue(new Error("realname unavailable"));
    apiMocks.orderList.mockResolvedValue(pageResult(9));
    await badges.refresh([MENU_BADGE_CODES.realname, MENU_BADGE_CODES.order]);

    expect(badges.counts[MENU_BADGE_CODES.realname]).toBe(7);
    expect(badges.counts[MENU_BADGE_CODES.order]).toBe(9);
    expect(badges.failed[MENU_BADGE_CODES.realname]).toBe(true);
    expect(badges.failed[MENU_BADGE_CODES.order]).toBe(false);
  });

  it("客服未读与待接入来源独立更新，单边失败保留另一边的新结果", async () => {
    apiMocks.conversationList.mockResolvedValue([
      conversation(
        "service-conversation-1",
        5,
        ConversationType.Service,
        ConversationMemberRole.Agent
      ),
    ]);
    apiMocks.serviceQueue.mockResolvedValue([{ conversationId: "service-1" }]);
    const { badges } = prepareStore();
    await badges.refresh([MENU_BADGE_CODES.service]);
    expect(badges.counts[MENU_BADGE_CODES.service]).toBe(6);

    apiMocks.conversationList.mockRejectedValue(
      new Error("conversation unavailable")
    );
    apiMocks.serviceQueue.mockResolvedValue([
      { conversationId: "service-1" },
      { conversationId: "service-2" },
      { conversationId: "service-3" },
    ]);
    await badges.refresh([MENU_BADGE_CODES.service]);
    expect(badges.counts[MENU_BADGE_CODES.service]).toBe(8);
    expect(badges.failed[MENU_BADGE_CODES.service]).toBe(true);

    apiMocks.conversationList.mockResolvedValue([
      conversation(
        "service-conversation-1",
        7,
        ConversationType.Service,
        ConversationMemberRole.Agent
      ),
    ]);
    apiMocks.serviceQueue.mockRejectedValue(new Error("queue unavailable"));
    await badges.refresh([MENU_BADGE_CODES.service]);
    expect(badges.counts[MENU_BADGE_CODES.service]).toBe(10);
    expect(badges.failed[MENU_BADGE_CODES.service]).toBe(true);
  });

  it("客服本地队列同步只废弃旧队列响应，不丢弃在途会话未读", async () => {
    const conversations = deferred<ConversationView[]>();
    const queue = deferred<Array<{ conversationId: string }>>();
    apiMocks.conversationList.mockReturnValueOnce(conversations.promise);
    apiMocks.serviceQueue.mockReturnValueOnce(queue.promise);
    const { badges } = prepareStore();

    const refresh = badges.refresh([MENU_BADGE_CODES.service]);
    badges.setServiceWaitingCount(4);
    conversations.resolve([
      conversation(
        "service-conversation-1",
        2,
        ConversationType.Service,
        ConversationMemberRole.Agent
      ),
    ]);
    queue.resolve([{ conversationId: "stale-service" }]);
    await refresh;

    expect(badges.counts[MENU_BADGE_CODES.service]).toBe(6);
  });

  it("较慢的旧请求完成后不能覆盖较新的角标结果", async () => {
    const first = deferred<ReturnType<typeof pageResult>>();
    const second = deferred<ReturnType<typeof pageResult>>();
    apiMocks.realnameList
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { badges } = prepareStore();

    const oldRefresh = badges.refresh([MENU_BADGE_CODES.realname]);
    const newRefresh = badges.refresh([MENU_BADGE_CODES.realname]);
    second.resolve(pageResult(2));
    await newRefresh;
    first.resolve(pageResult(99));
    await oldRefresh;

    expect(badges.counts[MENU_BADGE_CODES.realname]).toBe(2);
  });

  it("轮询立即刷新且每 30 秒仅执行一次，停止后不再刷新", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
    const { badges } = prepareStore();

    badges.startPolling();
    badges.startPolling();

    expect(apiMocks.realnameList).toHaveBeenCalledTimes(1);
    expect(apiMocks.orderList).toHaveBeenCalledTimes(1);
    expect(apiMocks.boosterList).toHaveBeenCalledTimes(1);
    expect(apiMocks.conversationList).toHaveBeenCalledTimes(1);
    expect(apiMocks.serviceQueue).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(29_999);
    expect(apiMocks.realnameList).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(apiMocks.realnameList).toHaveBeenCalledTimes(2);
    expect(apiMocks.orderList).toHaveBeenCalledTimes(2);
    expect(apiMocks.boosterList).toHaveBeenCalledTimes(2);
    expect(apiMocks.conversationList).toHaveBeenCalledTimes(2);
    expect(apiMocks.serviceQueue).toHaveBeenCalledTimes(2);

    badges.stopPolling();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(apiMocks.realnameList).toHaveBeenCalledTimes(2);
    expect(apiMocks.orderList).toHaveBeenCalledTimes(2);
    expect(apiMocks.boosterList).toHaveBeenCalledTimes(2);
    expect(apiMocks.conversationList).toHaveBeenCalledTimes(2);
    expect(apiMocks.serviceQueue).toHaveBeenCalledTimes(2);
  });

  it("实时消息突发只保留一个在途会话请求和一轮尾随刷新", async () => {
    const first = deferred<ConversationView[]>();
    const trailing = deferred<ConversationView[]>();
    apiMocks.conversationList
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(trailing.promise);
    const { badges } = prepareStore();

    const firstRefresh = badges.refreshConversationBadges();
    const secondRefresh = badges.refreshConversationBadges();
    const thirdRefresh = badges.refreshConversationBadges();
    expect(apiMocks.conversationList).toHaveBeenCalledTimes(1);

    first.resolve([conversation("conversation-1", 1)]);
    await vi.waitFor(() => {
      expect(apiMocks.conversationList).toHaveBeenCalledTimes(2);
    });
    trailing.resolve([conversation("conversation-1", 3)]);
    await Promise.all([firstRefresh, secondRefresh, thirdRefresh]);

    expect(apiMocks.conversationList).toHaveBeenCalledTimes(2);
    expect(apiMocks.serviceQueue).not.toHaveBeenCalled();
    expect(badges.counts[MENU_BADGE_CODES.im]).toBe(3);
  });

  it("页面本地同步会规范化数量，退出时清零并废弃在途请求", async () => {
    const pending = deferred<ReturnType<typeof pageResult>>();
    apiMocks.realnameList.mockImplementationOnce(() => pending.promise);
    const { badges } = prepareStore();

    const refresh = badges.refresh([MENU_BADGE_CODES.realname]);
    badges.syncConversationUnread([
      conversation("conversation-1", 120.8),
      conversation(
        "service-conversation-1",
        4.8,
        ConversationType.Service,
        ConversationMemberRole.Agent
      ),
      conversation(
        "service-conversation-2",
        Number.NaN,
        ConversationType.Service,
        ConversationMemberRole.Agent
      ),
    ]);
    badges.setServiceWaitingCount(2.8);
    expect(badges.counts[MENU_BADGE_CODES.im]).toBe(120);
    expect(badges.counts[MENU_BADGE_CODES.service]).toBe(6);

    badges.reset();
    pending.resolve(pageResult(6));
    await refresh;

    expect(Object.values(badges.counts)).toEqual([0, 0, 0, 0, 0]);
  });
});
