/**
 * Vite 环境变量类型声明。
 * HBuilderX 原生工程没有 node_modules，不引入 vite/client：
 * 仅补充本项目用到的 VITE_* 变量，保证 import.meta.env 的访问是类型安全的（见 config/env.ts）。
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_BASE_URL?: string;
  readonly VITE_TENANT_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
