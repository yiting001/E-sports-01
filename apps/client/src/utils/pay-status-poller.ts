import {
  createIntervalPoller,
  type IntervalScheduler,
} from './interval-poller';

/** 页面可见性宿主端口，便于单测注入。 */
export interface VisibilityHost {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

/** pageshow 宿主端口（webview 从后退缓存恢复时触发）。 */
export interface PageShowHost {
  addEventListener(type: 'pageshow', listener: () => void): void;
  removeEventListener(type: 'pageshow', listener: () => void): void;
}

export interface PayStatusPoller {
  dispose(): void;
}

/**
 * 支付结果轮询器：定时轮询之外，页面恢复可见（visibilitychange/pageshow）时
 * 立即补查一次并重启定时器。
 * 微信等内置浏览器切到支付宝/微信收银台后台时会冻结 JS 定时器，
 * 返回页面若不主动补查会漏掉支付成功状态、页面无法跳转。
 */
export function createPayStatusPoller(
  task: () => void,
  delayMs: number,
  scheduler: IntervalScheduler = window,
  visibilityHost: VisibilityHost = document,
  pageShowHost: PageShowHost = window,
): PayStatusPoller {
  const poller = createIntervalPoller(task, delayMs, scheduler);
  let disposed = false;

  function resume(): void {
    if (disposed) {
      return;
    }
    task();
    poller.setRunning(false);
    poller.setRunning(true);
  }

  function onVisibilityChange(): void {
    if (visibilityHost.visibilityState === 'visible') {
      resume();
    }
  }

  visibilityHost.addEventListener('visibilitychange', onVisibilityChange);
  pageShowHost.addEventListener('pageshow', resume);
  poller.setRunning(true);

  return {
    dispose(): void {
      disposed = true;
      visibilityHost.removeEventListener(
        'visibilitychange',
        onVisibilityChange,
      );
      pageShowHost.removeEventListener('pageshow', resume);
      poller.dispose();
    },
  };
}
