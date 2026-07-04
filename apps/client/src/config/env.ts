/**
 * C 端运行时配置。
 * 统一从 Vite 环境变量读取，集中一处导出，杜绝散落各文件的硬编码地址。
 */
export const ENV = {
  /** 后端 REST 基础地址（含 /api 前缀） */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
} as const;

/** 令牌在 localStorage 中的存储键，与管理端隔离，避免同域串号 */
export const STORAGE_KEYS = {
  accessToken: 'client.accessToken',
  refreshToken: 'client.refreshToken',
} as const;
