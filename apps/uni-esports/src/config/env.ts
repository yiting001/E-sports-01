/**
 * 小程序端运行时配置。
 * 统一从 Vite 环境变量读取（见 .env.example），集中一处导出，杜绝散落各文件的硬编码地址。
 * 小程序只能访问后台配置过的 https/wss 合法域名，这里不做运行时切换。
 */
export const ENV = {
  /** 后端 REST 基础地址（含 /api 前缀，https） */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  /** WebSocket 基础地址（wss，不含命名空间），供 IM 实时聊天连接 */
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL,
  /** 小程序绑定的租户编码 */
  tenantCode: import.meta.env.VITE_TENANT_CODE,
} as const;
