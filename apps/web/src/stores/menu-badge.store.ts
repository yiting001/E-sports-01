import type { ConversationView, MenuView } from "@app/contracts";
import {
  BoosterStatus,
  ConversationMemberRole,
  ConversationType,
  OrderStatus,
  PERMS,
  RealnameStatus,
} from "@app/contracts";
import { defineStore } from "pinia";
import { ref } from "vue";
import { boosterApi } from "@/api/booster.api";
import { imApi } from "@/api/im.api";
import { orderApi } from "@/api/order.api";
import { realnameApi } from "@/api/realname.api";
import { useAuthStore } from "@/stores/auth.store";
import { useMenuStore } from "@/stores/menu.store";

/** 需要展示业务待办数的菜单 code，复用 contracts 中既有菜单主键。 */
export const MENU_BADGE_CODES = {
  order: "order:admin:menu",
  booster: "booster:menu",
  realname: "realname:menu",
  im: "im:menu",
  service: "im:service:menu",
} as const;

export type MenuBadgeCode =
  (typeof MENU_BADGE_CODES)[keyof typeof MENU_BADGE_CODES];
export type MenuBadgeCounts = Record<MenuBadgeCode, number>;

const ALL_MENU_BADGE_CODES = [
  MENU_BADGE_CODES.order,
  MENU_BADGE_CODES.booster,
  MENU_BADGE_CODES.realname,
  MENU_BADGE_CODES.im,
  MENU_BADGE_CODES.service,
] as const satisfies readonly MenuBadgeCode[];

/** 探测列表总数时只取一行，避免菜单角标轮询传输完整业务列表。 */
const PROBE_PAGE = 1;
const PROBE_PAGE_SIZE = 1;
/** 与 C 端导航角标保持一致，兼顾待办可见性和后台请求量。 */
const POLL_INTERVAL_MS = 30_000;

type ConversationLoader = () => Promise<ConversationView[]>;
type NonServiceMenuBadgeCode = Exclude<
  MenuBadgeCode,
  typeof MENU_BADGE_CODES.service
>;

function emptyCounts(): MenuBadgeCounts {
  return {
    [MENU_BADGE_CODES.order]: 0,
    [MENU_BADGE_CODES.booster]: 0,
    [MENU_BADGE_CODES.realname]: 0,
    [MENU_BADGE_CODES.im]: 0,
    [MENU_BADGE_CODES.service]: 0,
  };
}

function emptyFailures(): Record<MenuBadgeCode, boolean> {
  return {
    [MENU_BADGE_CODES.order]: false,
    [MENU_BADGE_CODES.booster]: false,
    [MENU_BADGE_CODES.realname]: false,
    [MENU_BADGE_CODES.im]: false,
    [MENU_BADGE_CODES.service]: false,
  };
}

function hasMenu(items: MenuView[], code: MenuBadgeCode): boolean {
  return items.some(
    (item) =>
      item.code === code ||
      (item.children ? hasMenu(item.children, code) : false)
  );
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function unreadTotal(
  conversations: readonly ConversationView[],
  agentService: boolean
): number {
  return conversations.reduce((sum, conversation) => {
    const belongsToAgentService =
      conversation.type === ConversationType.Service &&
      conversation.viewerRole === ConversationMemberRole.Agent;
    return belongsToAgentService === agentService
      ? sum + normalizeCount(conversation.unread)
      : sum;
  }, 0);
}

/**
 * 管理端菜单角标状态。
 * 只编排已有业务 Gateway：权限不足时不请求，单项失败保留旧值，请求代次避免旧响应回写。
 */
export const useMenuBadgeStore = defineStore("menu-badge", () => {
  const auth = useAuthStore();
  const menuStore = useMenuStore();
  const counts = ref<MenuBadgeCounts>(emptyCounts());
  const failed = ref<Record<MenuBadgeCode, boolean>>(emptyFailures());
  const requestVersions = emptyCounts();
  let serviceUnread = 0;
  let serviceWaiting = 0;
  let serviceUnreadVersion = 0;
  let serviceWaitingVersion = 0;
  let serviceUnreadFailed = false;
  let serviceWaitingFailed = false;
  let conversationRefreshPending = false;
  let conversationRefreshTask: Promise<void> | null = null;
  let timer: number | null = null;

  function canLoad(code: MenuBadgeCode): boolean {
    if (!auth.profile || !hasMenu(menuStore.menus, code)) {
      return false;
    }
    switch (code) {
      case MENU_BADGE_CODES.realname:
        return auth.hasPermission(PERMS.realname.list);
      case MENU_BADGE_CODES.order:
        return auth.hasPermission(PERMS.order.list);
      case MENU_BADGE_CODES.booster:
        return auth.hasPermission(PERMS.booster.list);
      case MENU_BADGE_CODES.service:
        return auth.hasPermission(PERMS.im.serviceAgent);
      case MENU_BADGE_CODES.im:
        return true;
    }
  }

  async function fetchCount(
    code: NonServiceMenuBadgeCode,
    loadConversations: ConversationLoader
  ): Promise<number> {
    switch (code) {
      case MENU_BADGE_CODES.realname:
        return (
          await realnameApi.list(
            PROBE_PAGE,
            PROBE_PAGE_SIZE,
            RealnameStatus.Pending,
            { silent: true }
          )
        ).total;
      case MENU_BADGE_CODES.order:
        return (
          await orderApi.list(
            PROBE_PAGE,
            PROBE_PAGE_SIZE,
            OrderStatus.PendingService,
            undefined,
            { silent: true }
          )
        ).total;
      case MENU_BADGE_CODES.booster:
        return (
          await boosterApi.list(
            PROBE_PAGE,
            PROBE_PAGE_SIZE,
            BoosterStatus.Pending,
            undefined,
            { silent: true }
          )
        ).total;
      case MENU_BADGE_CODES.im: {
        const conversations = await loadConversations();
        return unreadTotal(conversations, false);
      }
    }
  }

  function applyServiceState(): void {
    counts.value = {
      ...counts.value,
      [MENU_BADGE_CODES.service]: normalizeCount(
        serviceUnread + serviceWaiting
      ),
    };
    failed.value = {
      ...failed.value,
      [MENU_BADGE_CODES.service]: serviceUnreadFailed || serviceWaitingFailed,
    };
  }

  function clearServiceState(): void {
    serviceUnreadVersion += 1;
    serviceWaitingVersion += 1;
    serviceUnread = 0;
    serviceWaiting = 0;
    serviceUnreadFailed = false;
    serviceWaitingFailed = false;
    applyServiceState();
  }

  /** IM 页面本地同步本人会话未读，普通 IM 与客服来源互不覆盖。 */
  function syncConversationUnread(
    conversations: readonly ConversationView[]
  ): void {
    requestVersions[MENU_BADGE_CODES.im] += 1;
    counts.value = {
      ...counts.value,
      [MENU_BADGE_CODES.im]: canLoad(MENU_BADGE_CODES.im)
        ? normalizeCount(unreadTotal(conversations, false))
        : 0,
    };
    if (canLoad(MENU_BADGE_CODES.service)) {
      serviceUnreadVersion += 1;
      serviceUnread = normalizeCount(unreadTotal(conversations, true));
      serviceUnreadFailed = false;
      applyServiceState();
    } else {
      clearServiceState();
    }
    failed.value = {
      ...failed.value,
      [MENU_BADGE_CODES.im]: false,
    };
  }

  /** 客服页面只同步租户 REST 队列长度，并保留已认领会话未读部分。 */
  function setServiceWaitingCount(value: number): void {
    if (canLoad(MENU_BADGE_CODES.service)) {
      serviceWaitingVersion += 1;
      serviceWaiting = normalizeCount(value);
      serviceWaitingFailed = false;
      applyServiceState();
    } else {
      clearServiceState();
    }
  }

  async function refreshOne(
    code: NonServiceMenuBadgeCode,
    loadConversations: ConversationLoader
  ): Promise<void> {
    const version = requestVersions[code] + 1;
    requestVersions[code] = version;
    if (!canLoad(code)) {
      counts.value = { ...counts.value, [code]: 0 };
      failed.value = { ...failed.value, [code]: false };
      return;
    }
    try {
      const count = await fetchCount(code, loadConversations);
      if (requestVersions[code] !== version) {
        return;
      }
      counts.value = {
        ...counts.value,
        [code]: normalizeCount(count),
      };
      failed.value = { ...failed.value, [code]: false };
    } catch {
      if (requestVersions[code] === version) {
        failed.value = { ...failed.value, [code]: true };
      }
    }
  }

  async function refreshServiceUnread(
    loadConversations: ConversationLoader
  ): Promise<void> {
    const version = serviceUnreadVersion + 1;
    serviceUnreadVersion = version;
    try {
      const conversations = await loadConversations();
      if (serviceUnreadVersion !== version) {
        return;
      }
      serviceUnread = normalizeCount(unreadTotal(conversations, true));
      serviceUnreadFailed = false;
      applyServiceState();
    } catch {
      if (serviceUnreadVersion === version) {
        serviceUnreadFailed = true;
        applyServiceState();
      }
    }
  }

  async function refreshServiceWaiting(): Promise<void> {
    const version = serviceWaitingVersion + 1;
    serviceWaitingVersion = version;
    try {
      const queue = await imApi.serviceQueue({ silent: true });
      if (serviceWaitingVersion !== version) {
        return;
      }
      serviceWaiting = normalizeCount(queue.length);
      serviceWaitingFailed = false;
      applyServiceState();
    } catch {
      if (serviceWaitingVersion === version) {
        serviceWaitingFailed = true;
        applyServiceState();
      }
    }
  }

  async function refreshService(
    loadConversations: ConversationLoader
  ): Promise<void> {
    if (!canLoad(MENU_BADGE_CODES.service)) {
      clearServiceState();
      return;
    }
    await Promise.all([
      refreshServiceUnread(loadConversations),
      refreshServiceWaiting(),
    ]);
  }

  async function refresh(
    codes: readonly MenuBadgeCode[] = ALL_MENU_BADGE_CODES
  ): Promise<void> {
    let conversations: Promise<ConversationView[]> | null = null;
    const loadConversations = (): Promise<ConversationView[]> => {
      conversations ??= imApi.listConversations({ silent: true });
      return conversations;
    };
    await Promise.all(
      codes.map((code) =>
        code === MENU_BADGE_CODES.service
          ? refreshService(loadConversations)
          : refreshOne(code, loadConversations)
      )
    );
  }

  /** 实时消息突发时单飞刷新会话来源，并在处理中有新信号时仅补一轮。 */
  function refreshConversationBadges(): Promise<void> {
    conversationRefreshPending = true;
    if (!conversationRefreshTask) {
      conversationRefreshTask = runConversationRefreshLoop().finally(() => {
        conversationRefreshTask = null;
      });
    }
    return conversationRefreshTask;
  }

  async function runConversationRefreshLoop(): Promise<void> {
    do {
      conversationRefreshPending = false;
      let conversations: Promise<ConversationView[]> | null = null;
      const loadConversations = (): Promise<ConversationView[]> => {
        conversations ??= imApi.listConversations({ silent: true });
        return conversations;
      };
      const tasks: Promise<void>[] = [
        refreshOne(MENU_BADGE_CODES.im, loadConversations),
      ];
      if (canLoad(MENU_BADGE_CODES.service)) {
        tasks.push(refreshServiceUnread(loadConversations));
      } else {
        clearServiceState();
      }
      await Promise.all(tasks);
    } while (conversationRefreshPending);
  }

  /** 客服排队事件只刷新队列来源，避免联动完整会话组装。 */
  async function refreshServiceQueue(): Promise<void> {
    if (!canLoad(MENU_BADGE_CODES.service)) {
      clearServiceState();
      return;
    }
    await refreshServiceWaiting();
  }

  function startPolling(): void {
    if (timer !== null) {
      return;
    }
    void refresh();
    timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
  }

  function stopPolling(): void {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function reset(): void {
    for (const code of ALL_MENU_BADGE_CODES) {
      requestVersions[code] += 1;
    }
    serviceUnreadVersion += 1;
    serviceWaitingVersion += 1;
    counts.value = emptyCounts();
    failed.value = emptyFailures();
    serviceUnread = 0;
    serviceWaiting = 0;
    serviceUnreadFailed = false;
    serviceWaitingFailed = false;
    conversationRefreshPending = false;
  }

  return {
    counts,
    failed,
    refresh,
    refreshConversationBadges,
    refreshServiceQueue,
    setServiceWaitingCount,
    startPolling,
    stopPolling,
    syncConversationUnread,
    reset,
  };
});
