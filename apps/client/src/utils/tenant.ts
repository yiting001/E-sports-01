import { DEFAULT_TENANT_CODE } from '@app/contracts';

/** 租户编码在 localStorage 中的存储键，与管理端隔离 */
const TENANT_CODE_KEY = 'client.tenantCode';

/**
 * 解析当前 C 端站点所属租户编码。
 * 优先取地址栏 `?tenant=<编码>`（进入即记住，便于同一部署服务多个租户入口），
 * 其次取本机已记住的编码，都没有则回落到内置默认租户。
 */
export function resolveTenantCode(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('tenant')?.trim();
  if (fromUrl) {
    localStorage.setItem(TENANT_CODE_KEY, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(TENANT_CODE_KEY)?.trim() || DEFAULT_TENANT_CODE;
}
