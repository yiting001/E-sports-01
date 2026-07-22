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
    let refreshVersion = 0;
    let refreshQueued = false;
    let refreshInFlight: Promise<void> | null = null;

    /** 合并突发刷新信号；并发期间最多尾随一轮，且只有最新代次可以落状态。 */
    async function runRefresh(initialVersion: number): Promise<void> {
      let version = initialVersion;
      while (true) {
        refreshQueued = false;
        try {
          const nextTotal = await fetchTotal();
          if (version === refreshVersion) {
            total.value = nextTotal;
          }
        } catch {
          // 背景刷新失败时保留上一次有效数量，由实时信号或轮询重试。
        }
        if (!refreshQueued) {
          return;
        }
        version = refreshVersion;
      }
    }

    function refresh(): Promise<void> {
      const version = ++refreshVersion;
      if (refreshInFlight) {
        refreshQueued = true;
        return refreshInFlight;
      }
      refreshInFlight = runRefresh(version).finally(() => {
        refreshInFlight = null;
      });
      return refreshInFlight;
    }

    /** 直接设置数量并废弃在途旧响应，避免已读后的本地结果被覆盖。 */
    function setTotal(value: number): void {
      refreshVersion += 1;
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
