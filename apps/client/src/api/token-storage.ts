import type { TokenPair } from '@app/contracts';
import { STORAGE_KEYS } from '@/config/env';

/**
 * 令牌持久化。
 * 单一职责：只负责 access/refresh token 的读写清理，
 * 供 HTTP 拦截器与鉴权 store 共用，避免两处各写一套 localStorage 逻辑。
 */
export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  },
  getRefresh(): string | null {
    return localStorage.getItem(STORAGE_KEYS.refreshToken);
  },
  save(pair: Pick<TokenPair, 'accessToken' | 'refreshToken'>): void {
    localStorage.setItem(STORAGE_KEYS.accessToken, pair.accessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, pair.refreshToken);
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  },
};
