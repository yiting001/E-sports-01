/**
 * 前端运行时配置。
 * 统一从 Vite 环境变量读取，集中一处导出，杜绝散落各文件的硬编码地址。
 */
export const ENV = {
  /** 后端 REST 基础地址（含 /api 前缀） */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  /** WebSocket 基础地址（不含命名空间） */
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL,
} as const;

/** 令牌在 localStorage 中的存储键，集中定义避免拼写漂移 */
export const STORAGE_KEYS = {
  accessToken: 'infra.accessToken',
  refreshToken: 'infra.refreshToken',
} as const;
