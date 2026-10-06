import type { TokenPair } from '@app/contracts';

/**
 * 令牌本地存储（小程序 Storage）。
 * 与 apps/client 的 token-storage 同语义：会话代数（generation）用于
 * 多请求并发刷新与登出竞态防护——旧会话的刷新结果不得覆盖当前会话。
 * 小程序端租户构建时固定，快照只需会话代数即可判定过期。
 */

const KEYS = {
  accessToken: 'uni.accessToken',
  refreshToken: 'uni.refreshToken',
} as const;

let generation = 0;

export interface AuthSessionSnapshot {
  generation: number;
}

function read(key: string): string {
  const value = uni.getStorageSync(key);
  return typeof value === 'string' ? value : '';
}

export const tokenStorage = {
  getAccess(): string {
    return read(KEYS.accessToken);
  },

  getRefresh(): string {
    return read(KEYS.refreshToken);
  },

  getSessionGeneration(): number {
    return generation;
  },

  captureSession(): AuthSessionSnapshot {
    return { generation };
  },

  isCurrentSession(snapshot: AuthSessionSnapshot): boolean {
    return snapshot.generation === generation;
  },

  save(pair: TokenPair): void {
    uni.setStorageSync(KEYS.accessToken, pair.accessToken);
    uni.setStorageSync(KEYS.refreshToken, pair.refreshToken);
  },

  /** 保存刷新结果；会话已失效（登出/重登）时丢弃，返回是否生效 */
  saveRefreshed(pair: TokenPair, snapshot: AuthSessionSnapshot): boolean {
    if (!this.isCurrentSession(snapshot)) {
      return false;
    }
    this.save(pair);
    return true;
  },

  /** 仅当仍是当前会话时清除登录态（避免误清登出后立即重登的新会话） */
  clearIfCurrent(snapshot: AuthSessionSnapshot): boolean {
    if (!this.isCurrentSession(snapshot)) {
      return false;
    }
    this.clear();
    return true;
  },

  clear(): void {
    generation += 1;
    uni.removeStorageSync(KEYS.accessToken);
    uni.removeStorageSync(KEYS.refreshToken);
  },
};
