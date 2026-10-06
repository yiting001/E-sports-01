/**
 * 小程序端运行时配置。
 * 统一从 Vite 环境变量读取（见 .env.development / .env.production），集中一处导出。
 * 注意：环境变量在「构建时」烘焙进产物——修改 env 文件后必须重新 dev/build 才会生效；
 * env 文件缺失时 import.meta.env 会被编译为空对象，导致所有请求发不出去（已由启动自检兜底）。
 */
function normalizeBaseUrl(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

export const ENV = {
  /** 后端 REST 基础地址（含 /api 前缀，https） */
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  /** WebSocket 基础地址（wss，不含命名空间），供 IM 实时聊天连接 */
  wsBaseUrl: normalizeBaseUrl(import.meta.env.VITE_WS_BASE_URL),
  /** 小程序绑定的租户编码 */
  tenantCode: normalizeBaseUrl(import.meta.env.VITE_TENANT_CODE),
} as const;

export const ENV_CONFIG_MISSING = !ENV.apiBaseUrl || !ENV.tenantCode;
