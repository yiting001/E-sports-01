/** vConsole 内置面板中保留的插件，刻意排除 storage 以降低令牌暴露风险。 */
type VConsolePlugin = 'system' | 'network' | 'element';

interface VConsoleOptions {
  defaultPlugins: VConsolePlugin[];
}

interface VConsoleInstance {
  destroy(): void;
}

interface VConsoleModule {
  default: new (options: VConsoleOptions) => VConsoleInstance;
}

export type VConsoleLoader = () => Promise<VConsoleModule>;

export interface VConsoleManager {
  sync(enabled: boolean): Promise<void>;
  destroy(): void;
}

const VCONSOLE_OPTIONS: VConsoleOptions = {
  defaultPlugins: ['system', 'network', 'element'],
};

const loadVConsole: VConsoleLoader = () => import('vconsole');

/** 创建带异步竞态保护的 vConsole 生命周期管理器。 */
export function createVConsoleManager(
  loader: VConsoleLoader = loadVConsole,
  isBrowser: () => boolean = () => typeof window !== 'undefined',
): VConsoleManager {
  let instance: VConsoleInstance | null = null;
  let revision = 0;

  async function sync(enabled: boolean): Promise<void> {
    if (!enabled) {
      destroy();
      return;
    }

    const requestRevision = ++revision;
    if (instance || !isBrowser()) {
      return;
    }

    try {
      const module = await loader();
      if (requestRevision !== revision || instance || !isBrowser()) {
        return;
      }
      instance = new module.default(VCONSOLE_OPTIONS);
    } catch {
      // 调试工具加载失败不应阻塞 C 端主流程。
    }
  }

  function destroy(): void {
    revision += 1;
    instance?.destroy();
    instance = null;
  }

  return { sync, destroy };
}

export const vConsoleManager = createVConsoleManager();
