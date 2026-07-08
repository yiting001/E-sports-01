import { defineStore } from 'pinia';
import { ref } from 'vue';

/** 角标数量轮询间隔（毫秒）：兼顾实时性与请求量 */
const POLL_INTERVAL_MS = 30_000;

/**
 * 导航角标 store 工厂。
 * 单一职责：封装「数量拉取 + 定时轮询 + 本地同步」的通用角标状态，
 * 各角标（消息未读、大厅待接单）只需提供数量拉取函数，避免重复实现轮询逻辑。
 */
export function defineBadgeStore(id: string, fetchTotal: () => Promise<number>) {
  return defineStore(id, () => {
    /** 角标数量 */
    const total = ref(0);
    let timer: number | null = null;

    /** 拉取最新数量；失败时保留上一次的值等待下次轮询 */
    async function refresh(): Promise<void> {
      try {
        total.value = await fetchTotal();
      } catch {
        // 静默失败：保留上一次的数量
      }
    }

    /** 直接设置数量（页面已持有列表数据时本地同步，免发请求） */
    function setTotal(value: number): void {
      total.value = value;
    }

    /** 启动轮询（幂等），立即刷新一次 */
    function startPolling(): void {
      if (timer !== null) {
        return;
      }
      void refresh();
      timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
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
}
