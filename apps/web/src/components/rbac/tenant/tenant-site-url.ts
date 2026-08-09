const ALLOWED_SITE_PROTOCOLS = new Set(["http:", "https:"]);
const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost"]);

/** 构造带租户编码的 C 端入口；配置不可用时关闭跳转。 */
export function buildTenantSiteUrl(
  clientBaseUrl: string | undefined,
  tenantCode: string,
  currentOrigin: string
): string | null {
  const baseUrl = resolveClientBaseUrl(clientBaseUrl, currentOrigin);
  if (!baseUrl) {
    return null;
  }
  try {
    const target = new URL(baseUrl, currentOrigin);
    if (!ALLOWED_SITE_PROTOCOLS.has(target.protocol)) {
      return null;
    }
    target.searchParams.set("tenantCode", tenantCode);
    return target.toString();
  } catch {
    return null;
  }
}

function resolveClientBaseUrl(
  clientBaseUrl: string | undefined,
  currentLocation: string
): string | null {
  const configuredUrl = clientBaseUrl?.trim();
  if (configuredUrl) {
    return isExplicitClientBaseUrl(configuredUrl) ? configuredUrl : null;
  }
  const current = parseCurrentLocation(currentLocation);
  if (!current) {
    return null;
  }
  if (current.pathname.startsWith("/admin/") || current.pathname === "/admin") {
    return current.origin;
  }
  if (LOCAL_HOSTNAMES.has(current.hostname) && current.port) {
    const port = Number(current.port);
    if (Number.isSafeInteger(port) && port > 0 && port < 65535) {
      current.port = String(port + 1);
      current.pathname = "/";
      current.search = "";
      current.hash = "";
      return current.toString();
    }
  }
  return null;
}

function isExplicitClientBaseUrl(clientBaseUrl: string): boolean {
  if (clientBaseUrl.startsWith("/")) {
    return true;
  }
  try {
    return ALLOWED_SITE_PROTOCOLS.has(new URL(clientBaseUrl).protocol);
  } catch {
    return false;
  }
}

function parseCurrentLocation(currentLocation: string): URL | null {
  try {
    return new URL(currentLocation);
  } catch {
    try {
      return new URL(currentLocation, currentLocation);
    } catch {
      return null;
    }
  }
}
