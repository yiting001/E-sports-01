import { describe, expect, it, vi } from 'vitest';
import {
  createIntervalPoller,
  type IntervalScheduler,
} from './interval-poller';

function createScheduler() {
  let callback: (() => void) | null = null;
  const scheduler: IntervalScheduler = {
    setInterval: vi.fn((next: () => void) => {
      callback = next;
      return 7;
    }),
    clearInterval: vi.fn(),
  };
  return {
    scheduler,
    run: () => callback?.(),
  };
}

describe('createIntervalPoller', () => {
  it('重复启动只创建一个定时器，并能暂停后恢复', () => {
    const task = vi.fn();
    const { scheduler, run } = createScheduler();
    const poller = createIntervalPoller(task, 5_000, scheduler);

    poller.setRunning(true);
    poller.setRunning(true);
    expect(scheduler.setInterval).toHaveBeenCalledTimes(1);

    run();
    expect(task).toHaveBeenCalledTimes(1);

    poller.setRunning(false);
    expect(scheduler.clearInterval).toHaveBeenCalledWith(7);

    poller.setRunning(true);
    expect(scheduler.setInterval).toHaveBeenCalledTimes(2);
  });

  it('销毁时清理已启动的定时器', () => {
    const { scheduler } = createScheduler();
    const poller = createIntervalPoller(() => undefined, 5_000, scheduler);

    poller.setRunning(true);
    poller.dispose();
    poller.dispose();

    expect(scheduler.clearInterval).toHaveBeenCalledTimes(1);
  });
});
