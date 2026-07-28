import type { TokenPair } from '@app/contracts';
import { DEFAULT_TENANT_CODE } from '@app/contracts';
import { STORAGE_KEYS } from '@/config/env';
import { tenantContext } from '@/tenant/tenant-context';

type TokenChangeListener = () => void;

const tokenChangeListeners = new Set<TokenChangeListener>();
let authSessionGeneration = 0;

export interface AuthSessionSnapshot {
  tenantCode: string;
  tenantRevision: number;
  generation: number;
  refreshToken: string | null;
}

function notifyTokenChange(): void {
  tokenChangeListeners.forEach((listener) => listener());
}

function tenantStorageKey(baseKey: string): string {
  return `${baseKey}.${tenantContext.getCode()}`;
}

function browserStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function readToken(baseKey: string): string | null {
  if (tenantContext.entryError.value) {
    return null;
  }
  const storage = browserStorage();
  if (!storage) {
    return null;
  }
  const scopedKey = tenantStorageKey(baseKey);
  const scopedValue = storage.getItem(scopedKey);
  if (scopedValue || tenantContext.getCode() !== DEFAULT_TENANT_CODE) {
    return scopedValue;
  }

  const legacyValue = storage.getItem(baseKey);
  if (legacyValue) {
    storage.setItem(scopedKey, legacyValue);
    storage.removeItem(baseKey);
  }
  return legacyValue;
}

function writeCurrentTokens(
  pair: Pick<TokenPair, 'accessToken' | 'refreshToken'>
): void {
  const storage = browserStorage();
  storage?.setItem(
    tenantStorageKey(STORAGE_KEYS.accessToken),
    pair.accessToken
  );
  storage?.setItem(
    tenantStorageKey(STORAGE_KEYS.refreshToken),
    pair.refreshToken
  );
}

function removeCurrentTokens(): void {
  const storage = browserStorage();
  storage?.removeItem(tenantStorageKey(STORAGE_KEYS.accessToken));
  storage?.removeItem(tenantStorageKey(STORAGE_KEYS.refreshToken));
  if (tenantContext.getCode() === DEFAULT_TENANT_CODE) {
    storage?.removeItem(STORAGE_KEYS.accessToken);
    storage?.removeItem(STORAGE_KEYS.refreshToken);
  }
}

function captureSession(): AuthSessionSnapshot {
  return {
    tenantCode: tenantContext.getCode(),
    tenantRevision: tenantContext.revision.value,
    generation: authSessionGeneration,
    refreshToken: readToken(STORAGE_KEYS.refreshToken),
  };
}

function isCurrentSession(snapshot: AuthSessionSnapshot): boolean {
  return (
    !tenantContext.entryError.value &&
    snapshot.tenantCode === tenantContext.getCode() &&
    snapshot.tenantRevision === tenantContext.revision.value &&
    snapshot.generation === authSessionGeneration &&
    snapshot.refreshToken === readToken(STORAGE_KEYS.refreshToken)
  );
}

/**
 * 令牌持久化。
 * 单一职责：只负责 access/refresh token 的读写清理，
 * 供 HTTP 拦截器与鉴权 store 共用，避免两处各写一套 localStorage 逻辑。
 */
export const tokenStorage = {
  getAccess(): string | null {
    return readToken(STORAGE_KEYS.accessToken);
  },
  getRefresh(): string | null {
    return readToken(STORAGE_KEYS.refreshToken);
  },
  getSessionGeneration(): number {
    return authSessionGeneration;
  },
  captureSession,
  isCurrentSession,
  save(pair: Pick<TokenPair, 'accessToken' | 'refreshToken'>): void {
    if (tenantContext.entryError.value) {
      return;
    }
    writeCurrentTokens(pair);
    authSessionGeneration += 1;
    notifyTokenChange();
  },
  saveRefreshed(
    pair: Pick<TokenPair, 'accessToken' | 'refreshToken'>,
    snapshot: AuthSessionSnapshot
  ): AuthSessionSnapshot | null {
    if (!isCurrentSession(snapshot)) {
      return null;
    }
    writeCurrentTokens(pair);
    notifyTokenChange();
    return captureSession();
  },
  clear(): void {
    if (tenantContext.entryError.value) {
      return;
    }
    removeCurrentTokens();
    authSessionGeneration += 1;
    notifyTokenChange();
  },
  clearIfCurrent(snapshot: AuthSessionSnapshot): boolean {
    if (!isCurrentSession(snapshot)) {
      return false;
    }
    removeCurrentTokens();
    authSessionGeneration += 1;
    notifyTokenChange();
    return true;
  },
  onChange(listener: TokenChangeListener): () => void {
    tokenChangeListeners.add(listener);
    return () => tokenChangeListeners.delete(listener);
  },
};

tenantContext.onChange(() => {
  authSessionGeneration += 1;
  notifyTokenChange();
});
