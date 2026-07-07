/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 构建 base（部署子路径，如 /admin/），由 vite.config 的 base 注入 */
  readonly BASE_URL: string;
  /** 后端 REST 基础地址，例如 http://127.0.0.1:3000/api */
  readonly VITE_API_BASE_URL: string;
  /** WebSocket 基础地址，例如 http://127.0.0.1:3000 */
  readonly VITE_WS_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
