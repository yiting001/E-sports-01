import { defineStore } from 'pinia';
import { ref } from 'vue';
import { imApi } from '@/api/im.api';
import { useAuthStore } from '@/stores/auth.store';

/** 未读数轮询间隔（毫秒）：兼顾实时性与请求量 */
const POLL_INTERVAL_MS = 30_000;

/**
 * C 端未读消息状态。
 * 单一职责：汇总我的会话未读数，供导航「消息」入口角标展示；
 * 未读数由后端按会话已读位点（lastReadAt）计算，本 store 只做求和与轮询刷新。
 */
export const useUnreadStore = defineStore('unread', () => {
  /** 全部会话未读消息总数 */
  const total = ref(0);
  let timer: number | null = null;

  /** 拉取会话列表并汇总未读数；未登录时清零 */
  async function refresh(): Promise<void> {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) {
      total.value = 0;
      return;
    }
    try {
      const list = await imApi.listConversations();
      total.value = list.reduce((sum, conv) => sum + conv.unread, 0);
    } catch {
      // 静默失败：保留上一次的未读数，等待下次轮询
    }
  }

  /** 启动轮询（幂等），立即刷新一次 */
  function startPolling(): void {
    if (timer !== null) {
      return;
    }
    void refresh();
    timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
  }

  /** 直接设置总未读数（消息页已持有会话列表时本地同步，免发请求） */
  function setTotal(value: number): void {
    total.value = value;
  }

  /** 停止轮询 */
  function stopPolling(): void {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  return { total, refresh, setTotal, startPolling, stopPolling };
});
