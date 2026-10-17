import { DEFAULT_TENANT_CODE } from '@app/contracts';
import { readonly, ref } from 'vue';

export const TENANT_HEADER_NAME = 'X-Tenant-Code';

const TENANT_QUERY_KEY = 'tenantCode';
const TENANT_PATH_PATTERN = /^\/t\/([^/]+)\/?$/;
const TENANT_SESSION_KEY = 'client.tenantCode';
const TENANT_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const INVALID_TENANT_ENTRY_MESSAGE = '租户地址无效，请检查链接后重新打开';
export const TENANT_UNAVAILABLE_ENTRY_MESSAGE =
  '租户不存在或已停用，请检查链接或联系管理员';

export const TenantEntryStatus = {
  Validating: 'validating',
  Ready: 'ready',
  Rejected: 'rejected',
} as const;

export type TenantEntryStatus =
  (typeof TenantEntryStatus)[keyof typeof TenantEntryStatus];

type TenantChangeListener = (tenantCode: string) => void;

function normalizeTenantCode(value: string | null | undefined): string | null {
  const code = value?.trim().toLowerCase() ?? '';
  return TENANT_CODE_PATTERN.test(code) ? code : null;
}

export interface TenantEntryResolution {
  code: string;
  error: string | null;
}

/** hash 路由下 tenantCode 位于 # 之后的路由 query 段；兼容旧链接的 search 参数。 */
export function extractTenantQuery(search: string, hash: string): string {
  const searchQuery = new URLSearchParams(search);
  if (searchQuery.has(TENANT_QUERY_KEY)) {
    return search;
  }
  const queryIndex = hash.indexOf('?');
  return queryIndex < 0 ? '' : hash.slice(queryIndex + 1);
}

/**
 * 无参数租户入口 /t/<tenantCode>。
 * 微信菜单和短链使用路径而不是 query 参数，避免 ?tenantCode= 触发 URL 风控；
 * 只接受根路径下的单段租户编码，其他路径不参与租户解析。
 */
export function extractTenantPath(pathname: string): string | null {
  const match = TENANT_PATH_PATTERN.exec(pathname);
  return match ? match[1] : null;
}

/** 显式 URL 入口优先；路径与 query 冲突或语法无效时关闭入口，不能静默落入其他租户。 */
export function resolveTenantEntry(
  search: string,
  storedCode: string | null,
  pathCode: string | null = null
): TenantEntryResolution {
  const query = new URLSearchParams(search);
  const hasQuery = query.has(TENANT_QUERY_KEY);
  const values = query.getAll(TENANT_QUERY_KEY);
  const queryCode =
    values.length === 1 ? normalizeTenantCode(values[0]) : null;

  if (pathCode !== null) {
    const normalizedPathCode = normalizeTenantCode(pathCode);
    if (!normalizedPathCode || (hasQuery && queryCode !== normalizedPathCode)) {
      return {
        code: DEFAULT_TENANT_CODE,
        error: INVALID_TENANT_ENTRY_MESSAGE,
      };
    }
    return { code: normalizedPathCode, error: null };
  }

  if (hasQuery) {
    return queryCode
      ? { code: queryCode, error: null }
      : { code: DEFAULT_TENANT_CODE, error: INVALID_TENANT_ENTRY_MESSAGE };
  }
  return {
    code: normalizeTenantCode(storedCode) ?? DEFAULT_TENANT_CODE,
    error: null,
  };
}

/** 从浏览器地址解析初始租户；独立为纯函数，便于覆盖路径、query 与会话存储的优先级。 */
export function resolveTenantLocation(
  pathname: string,
  search: string,
  hash: string,
  storedCode: string | null
): TenantEntryResolution {
  return resolveTenantEntry(
    extractTenantQuery(search, hash),
    storedCode,
    extractTenantPath(pathname)
  );
}

function readSessionTenantCode(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.sessionStorage.getItem(TENANT_SESSION_KEY);
  } catch {
    return null;
  }
}

function persistSessionTenantCode(tenantCode: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(TENANT_SESSION_KEY, tenantCode);
  } catch {
    // 隐私模式禁用 Storage 时仍保留当前页面内存上下文。
  }
}

function initialTenantEntry(): TenantEntryResolution {
  if (typeof window === 'undefined') {
    return resolveTenantEntry('', null);
  }
  return resolveTenantLocation(
    window.location.pathname,
    window.location.search,
    window.location.hash,
    readSessionTenantCode()
  );
}

const initialEntry = initialTenantEntry();
const currentCode = ref(initialEntry.code);
const entryError = ref<string | null>(initialEntry.error);
const entryStatus = ref<TenantEntryStatus>(
  initialEntry.error ? TenantEntryStatus.Rejected : TenantEntryStatus.Validating
);
const currentRevision = ref(0);
const listeners = new Set<TenantChangeListener>();
if (!entryError.value) {
  persistSessionTenantCode(currentCode.value);
}

export const tenantContext = {
  code: readonly(currentCode),
  entryError: readonly(entryError),
  entryStatus: readonly(entryStatus),
  revision: readonly(currentRevision),

  getCode(): string {
    return currentCode.value;
  },

  getRequestCode(): string {
    if (entryError.value) {
      throw new Error(entryError.value);
    }
    return currentCode.value;
  },

  setCode(value?: string): string {
    const input = value?.trim() ?? '';
    const nextCode = input ? normalizeTenantCode(input) : DEFAULT_TENANT_CODE;
    if (!nextCode) {
      throw new Error('租户编码须为 3-64 位小写字母、数字或连字符');
    }
    const recovered = entryStatus.value === TenantEntryStatus.Rejected;
    entryError.value = null;
    persistSessionTenantCode(nextCode);
    if (nextCode === currentCode.value) {
      if (recovered) {
        entryStatus.value = TenantEntryStatus.Validating;
        currentRevision.value += 1;
        listeners.forEach((listener) => listener(nextCode));
      }
      return nextCode;
    }
    currentCode.value = nextCode;
    entryStatus.value = TenantEntryStatus.Validating;
    currentRevision.value += 1;
    listeners.forEach((listener) => listener(nextCode));
    return nextCode;
  },

  markReady(tenantCode: string, tenantRevision: number): boolean {
    if (
      currentCode.value !== tenantCode ||
      currentRevision.value !== tenantRevision ||
      entryStatus.value === TenantEntryStatus.Rejected
    ) {
      return false;
    }
    entryStatus.value = TenantEntryStatus.Ready;
    return true;
  },

  rejectCurrent(tenantCode: string, tenantRevision: number): boolean {
    if (
      currentCode.value !== tenantCode ||
      currentRevision.value !== tenantRevision
    ) {
      return false;
    }
    entryError.value = TENANT_UNAVAILABLE_ENTRY_MESSAGE;
    entryStatus.value = TenantEntryStatus.Rejected;
    currentRevision.value += 1;
    listeners.forEach((listener) => listener(tenantCode));
    return true;
  },

  onChange(listener: TenantChangeListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
