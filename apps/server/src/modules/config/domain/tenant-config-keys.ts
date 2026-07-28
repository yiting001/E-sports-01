import { CONFIG_KEYS } from '@app/contracts';

/**
 * 当前允许租户独立覆盖的配置键。
 * 未登记键始终属于平台全局配置，避免租户修改支付、短信等基础设施参数。
 */
export const TENANT_OVERRIDABLE_CONFIG_KEYS = [
  CONFIG_KEYS.system.appName,
  CONFIG_KEYS.system.appLogo,
  CONFIG_KEYS.portal.homeBanner,
  CONFIG_KEYS.portal.showRank,
  CONFIG_KEYS.auth.userAgreement,
] as const;

const TENANT_OVERRIDABLE_CONFIG_KEY_SET: ReadonlySet<string> = new Set(
  TENANT_OVERRIDABLE_CONFIG_KEYS,
);

export function isTenantOverridableConfigKey(key: string): boolean {
  return TENANT_OVERRIDABLE_CONFIG_KEY_SET.has(key);
}
