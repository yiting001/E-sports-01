import { DEFAULT_TENANT_CODE } from '@app/contracts';
import { ENV } from '@/config/env';

/**
 * 小程序端租户上下文。
 * 与 H5 不同：小程序没有地址栏，构建时通过 VITE_TENANT_CODE 固定归属租户；
 * 仅允许「扫码进入」等场景参数 tenantCode 覆盖（如运营向不同租户分发带参二维码），
 * 覆盖结果持久化，后续启动沿用，避免用户被静默切回默认租户。
 */

const TENANT_STORAGE_KEY = 'uni.tenantCode';
const TENANT_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

let currentCode = DEFAULT_TENANT_CODE;

function normalizeTenantCode(value: unknown): string | null {
  const code = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return TENANT_CODE_PATTERN.test(code) ? code : null;
}

export const TENANT_HEADER_NAME = 'X-Tenant-Code';

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
      uni.setStorageSync(TENANT_STORAGE_KEY, fromQuery);
      return;
    }
    const fromBuild = normalizeTenantCode(ENV.tenantCode);
    if (fromBuild) {
      // 构建配置是小程序主体的权威归属，不使用历史持久化值，避免串租户
      currentCode = fromBuild;
      return;
    }
    const stored = normalizeTenantCode(uni.getStorageSync(TENANT_STORAGE_KEY));
    currentCode = stored ?? DEFAULT_TENANT_CODE;
  },
};
