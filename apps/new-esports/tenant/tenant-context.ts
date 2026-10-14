import { DEFAULT_TENANT_CODE } from '@/types/api';
import { ENV, STORAGE_KEYS } from '@/config/env';

/**
 * 租户上下文。
 * 小程序没有地址栏，归属租户由构建配置 VITE_TENANT_CODE 固定；
 * 仅允许「扫码进入」等场景参数 tenantCode 覆盖（运营向不同租户分发带参二维码），
 * 覆盖结果持久化，后续启动沿用，避免用户被静默切回默认租户。
 */

/** 租户头名称：与 apps/client、apps/uni-esports 一致，服务端按此解析租户上下文 */
export const TENANT_HEADER_NAME = 'X-Tenant-Code';

const TENANT_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

let currentCode = DEFAULT_TENANT_CODE;

function normalizeTenantCode(value: unknown): string | null {
  const code = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return TENANT_CODE_PATTERN.test(code) ? code : null;
}

export const tenantContext = {
  /** 当前租户编码（请求头与展示共用） */
  getCode(): string {
    return currentCode;
  },

  /** App.onLaunch 调用：场景参数 > 构建配置 > 本地持久化 > 默认租户 */
  initialize(queryCode?: string): void {
    const fromQuery = normalizeTenantCode(queryCode);
    if (fromQuery) {
      currentCode = fromQuery;
      uni.setStorageSync(STORAGE_KEYS.tenantCode, fromQuery);
      return;
    }
    const fromBuild = normalizeTenantCode(ENV.tenantCode);
    if (fromBuild) {
      // 构建配置是本工程主体的权威归属，不使用历史持久化值，避免串租户
      currentCode = fromBuild;
      return;
    }
    const stored = normalizeTenantCode(uni.getStorageSync(STORAGE_KEYS.tenantCode));
    currentCode = stored ?? DEFAULT_TENANT_CODE;
  },
};
