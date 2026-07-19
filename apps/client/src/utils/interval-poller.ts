/** 浏览器定时器的最小端口，便于验证启动、暂停与销毁行为。 */
export interface IntervalScheduler {
  setInterval(callback: () => void, delayMs: number): number;
  clearInterval(handle: number): void;
}

export interface IntervalPoller {
  setRunning(running: boolean): void;
  dispose(): void;
}

/** 创建幂等的定时轮询器；暂停或销毁后不会继续执行任务。 */
export function createIntervalPoller(
  task: () => void,
  delayMs: number,
  scheduler: IntervalScheduler = window,
): IntervalPoller {
  let handle: number | null = null;

  function stop(): void {
    if (handle === null) {
      return;
    }
    scheduler.clearInterval(handle);
    handle = null;
  }

  function setRunning(running: boolean): void {
    if (!running) {
      stop();
      return;
    }
    if (handle === null) {
      handle = scheduler.setInterval(task, delayMs);
    }
  }

  return { setRunning, dispose: stop };
}
