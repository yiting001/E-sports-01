import { describe, expect, it, vi } from 'vitest';
import type { IntervalScheduler } from './interval-poller';
import {
  createPayStatusPoller,
  type PageShowHost,
  type VisibilityHost,
} from './pay-status-poller';

function createScheduler() {
  let callback: (() => void) | null = null;
  let nextHandle = 1;
  const scheduler: IntervalScheduler = {
    setInterval: vi.fn((next: () => void) => {
      callback = next;
      return nextHandle++;
    }),
    clearInterval: vi.fn(() => {
      callback = null;
    }),
  };
  return {
    scheduler,
    tick: () => callback?.(),
  };
}

function createHosts(initialState: DocumentVisibilityState = 'visible') {
  let visibilityListener: (() => void) | null = null;
  let pageShowListener: (() => void) | null = null;
  const state = { value: initialState };
  const visibilityHost: VisibilityHost = {
    get visibilityState() {
      return state.value;
    },
    addEventListener: (_type, listener) => {
      visibilityListener = listener;
    },
    removeEventListener: () => {
      visibilityListener = null;
    },
  };
  const pageShowHost: PageShowHost = {
    addEventListener: (_type, listener) => {
      pageShowListener = listener;
    },
    removeEventListener: () => {
      pageShowListener = null;
    },
  };
  return {
    visibilityHost,
    pageShowHost,
    setVisibility(next: DocumentVisibilityState) {
      state.value = next;
      visibilityListener?.();
    },
    firePageShow() {
      pageShowListener?.();
    },
    hasListeners() {
      return visibilityListener !== null || pageShowListener !== null;
    },
  };
}

describe('createPayStatusPoller', () => {
  it('启动后按间隔轮询', () => {
    const task = vi.fn();
    const { scheduler, tick } = createScheduler();
    const hosts = createHosts();
    createPayStatusPoller(
      task,
      3_000,
      scheduler,
      hosts.visibilityHost,
      hosts.pageShowHost,
    );

    expect(scheduler.setInterval).toHaveBeenCalledTimes(1);
    tick();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('页面恢复可见时立即补查并重启定时器', () => {
    const task = vi.fn();
    const { scheduler } = createScheduler();
    const hosts = createHosts('hidden');
    createPayStatusPoller(
      task,
      3_000,
      scheduler,
      hosts.visibilityHost,
      hosts.pageShowHost,
    );

    hosts.setVisibility('visible');
    expect(task).toHaveBeenCalledTimes(1);
    expect(scheduler.clearInterval).toHaveBeenCalledTimes(1);
    expect(scheduler.setInterval).toHaveBeenCalledTimes(2);
  });

  it('切到后台不补查', () => {
    const task = vi.fn();
    const { scheduler } = createScheduler();
    const hosts = createHosts();
    createPayStatusPoller(
      task,
      3_000,
      scheduler,
      hosts.visibilityHost,
      hosts.pageShowHost,
    );

    hosts.setVisibility('hidden');
    expect(task).not.toHaveBeenCalled();
  });

  it('pageshow 恢复时立即补查', () => {
    const task = vi.fn();
    const { scheduler } = createScheduler();
    const hosts = createHosts();
    createPayStatusPoller(
      task,
      3_000,
      scheduler,
      hosts.visibilityHost,
      hosts.pageShowHost,
    );

    hosts.firePageShow();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('销毁后移除监听且不再补查', () => {
    const task = vi.fn();
    const { scheduler } = createScheduler();
    const hosts = createHosts();
    const poller = createPayStatusPoller(
      task,
      3_000,
      scheduler,
      hosts.visibilityHost,
      hosts.pageShowHost,
    );

    poller.dispose();
    expect(hosts.hasListeners()).toBe(false);
    hosts.firePageShow();
    expect(task).not.toHaveBeenCalled();
    expect(scheduler.clearInterval).toHaveBeenCalled();
  });
});
