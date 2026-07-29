import { describe, expect, it, vi } from 'vitest';
import { createVConsoleManager } from './vconsole';

function createFixture() {
  const instances: FakeVConsole[] = [];

  class FakeVConsole {
    readonly destroy = vi.fn();

    constructor() {
      instances.push(this);
    }
  }

  const loader = vi.fn(async () => ({ default: FakeVConsole }));
  const manager = createVConsoleManager(loader, () => true);
  return { instances, loader, manager };
}

describe('createVConsoleManager', () => {
  it('启用时只创建一个实例，关闭时销毁', async () => {
    const { instances, loader, manager } = createFixture();
    await manager.sync(true);
    await manager.sync(true);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(instances).toHaveLength(1);
    manager.destroy();
    expect(instances[0].destroy).toHaveBeenCalledTimes(1);
  });

  it('异步加载完成前关闭时不会误创建实例', async () => {
    const instances: FakeVConsole[] = [];
    class FakeVConsole {
      destroy(): void {
        return undefined;
      }
      constructor() {
        instances.push(this);
      }
    }
    let resolveModule: ((module: { default: typeof FakeVConsole }) => void) | undefined;
    const loader = () =>
      new Promise<{ default: typeof FakeVConsole }>((resolve) => {
        resolveModule = resolve;
      });
    const manager = createVConsoleManager(loader, () => true);
    const enabling = manager.sync(true);
    manager.destroy();
    resolveModule?.({ default: FakeVConsole });
    await enabling;
    expect(instances).toHaveLength(0);
  });

  it('非浏览器环境或加载失败时保持关闭', async () => {
    const loader = vi.fn(async () => {
      throw new Error('load failed');
    });
    await createVConsoleManager(loader, () => false).sync(true);
    expect(loader).not.toHaveBeenCalled();
    await expect(
      createVConsoleManager(loader, () => true).sync(true),
    ).resolves.toBeUndefined();
  });
});
