/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ImportMetaEnv {
  /** 后端 REST 基础地址（含 /api 前缀，必须 https，需在小程序后台配置 request 合法域名） */
  readonly VITE_API_BASE_URL: string;
  /** WebSocket 基础地址（wss，需在小程序后台配置 socket 合法域名） */
  readonly VITE_WS_BASE_URL: string;
  /** 小程序绑定的租户编码（小程序无法像 H5 一样从地址栏携带） */
  readonly VITE_TENANT_CODE: string;
}
