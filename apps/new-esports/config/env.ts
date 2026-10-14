/**
 * 运行时环境配置（单一来源）。
 * 值来自项目根目录的 .env / .env.development / .env.production：
 * Vite 在「编译期」把 import.meta.env.VITE_* 静态替换进产物，修改 env 文件后必须重新运行/发布才生效；
 * env 文件缺失时 import.meta.env 取不到值，由 ENV_CONFIG_MISSING 暴露给启动自检，避免请求全部静默失败。
 */

/** 去掉首尾空白与结尾斜杠，避免拼接出 //api 这类地址 */
function normalizeUrl(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

export const ENV = {
  /** 后端 REST 基础地址（含 /api 前缀） */
  apiBaseUrl: normalizeUrl(import.meta.env.VITE_API_BASE_URL),
  /** WebSocket 基础地址（不含命名空间），供 IM 实时聊天连接 */
  wsBaseUrl: normalizeUrl(import.meta.env.VITE_WS_BASE_URL),
  /** 本工程归属的租户编码，构建时固定（小程序无地址栏） */
  tenantCode: normalizeUrl(import.meta.env.VITE_TENANT_CODE),
  /** 请求超时（毫秒），与 apps/client、apps/uni-esports 对齐 */
  requestTimeout: 15000,
} as const;

/** 关键构建配置缺失标记：App 启动自检与 http 层据此提前失败，给出可操作的修复提示 */
export const ENV_CONFIG_MISSING = !ENV.apiBaseUrl || !ENV.tenantCode;

/** 本地存储键，按工程名隔离，避免同机多端串号 */
export const STORAGE_KEYS = {
  accessToken: 'newEsports.accessToken',
  refreshToken: 'newEsports.refreshToken',
  tenantCode: 'newEsports.tenantCode',
  /** 弹窗公告已读版本（按「公告 id + 更新时间」记录，内容更新后重新弹出） */
  noticePopupSeen: 'newEsports.notice.popup.seen',
} as const;
