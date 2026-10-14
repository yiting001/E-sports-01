import { STORAGE_KEYS } from '@/config/env';
import type { TokenPair } from '@/types/api';

/**
 * 令牌本地存储（uni Storage）。
 * 与 apps/client 的 token-storage 同语义：会话代数 generation 用于并发刷新与登出竞态防护——
 * 仅清除登录态时递增代数，使刷新前捕获的旧快照失效，旧的刷新结果不得覆盖当前会话；
 * 同时承载 onAuthExpired 的统一清理入口（见 api/http.ts）。
 */

let generation = 0;

/** 会话快照：刷新前后校验会话是否仍是发起请求时的那一个 */
export interface AuthSessionSnapshot {
  generation: number;
}

function read(key: string): string {
  const value = uni.getStorageSync(key);
  return typeof value === 'string' ? value : '';
}

function write(pair: Pick<TokenPair, 'accessToken' | 'refreshToken'>): void {
  uni.setStorageSync(STORAGE_KEYS.accessToken, pair.accessToken);
  uni.setStorageSync(STORAGE_KEYS.refreshToken, pair.refreshToken);
}

function remove(): void {
  uni.removeStorageSync(STORAGE_KEYS.accessToken);
  uni.removeStorageSync(STORAGE_KEYS.refreshToken);
}

export const tokenStorage = {
  getAccess(): string {
    return read(STORAGE_KEYS.accessToken);
  },

  getRefresh(): string {
    return read(STORAGE_KEYS.refreshToken);
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

  /** 登录/注册成功后写入令牌（不递增代数：并发 401 复用同一次刷新） */
  save(pair: TokenPair): void {
    write(pair);
  },

  /** 保存刷新结果；会话已失效（登出/重登）时丢弃，返回是否生效 */
  saveRefreshed(
    pair: Pick<TokenPair, 'accessToken' | 'refreshToken'>,
    snapshot: AuthSessionSnapshot,
  ): boolean {
    if (!this.isCurrentSession(snapshot)) {
      return false;
    }
    write(pair);
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
    remove();
  },
};
