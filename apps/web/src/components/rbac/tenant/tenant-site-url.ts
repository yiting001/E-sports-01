const ALLOWED_SITE_PROTOCOLS = new Set(["http:", "https:"]);

/** 构造带租户编码的 C 端入口；配置不可用时关闭跳转。 */
export function buildTenantSiteUrl(
  clientBaseUrl: string | undefined,
  tenantCode: string,
  currentOrigin: string
): string | null {
  const configuredUrl = clientBaseUrl?.trim();
  if (!configuredUrl) {
    return null;
  }
  try {
    const target = new URL(configuredUrl, currentOrigin);
    if (!ALLOWED_SITE_PROTOCOLS.has(target.protocol)) {
      return null;
    }
    target.searchParams.set("tenantCode", tenantCode);
    return target.toString();
  } catch {
    return null;
  }
}
