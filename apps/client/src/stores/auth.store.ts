import type { AuthProfile, SmsLoginPayload, SmsRegisterPayload, TokenPair } from '@app/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '@/api/auth.api';
import { tokenStorage } from '@/api/token-storage';
import { useCheckoutDraftStore } from '@/stores/checkout-draft.store';

/**
 * C 端鉴权状态。
 * 单一职责：维护登录态与当前用户资料，封装短信登录/注册、资料加载与登出。
 * 令牌持久化交给 tokenStorage，本 store 只在内存中缓存资料。
 */
export const useAuthStore = defineStore('auth', () => {
  /** 是否持有访问令牌（初始态由本地存储恢复） */
  const authed = ref<boolean>(Boolean(tokenStorage.getAccess()));
  /** 当前登录用户资料，未登录或未加载为 null */
  const profile = ref<AuthProfile | null>(null);

  /** 是否已登录 */
  const isAuthenticated = computed(() => authed.value);

  function clearSessionState(): void {
    authed.value = false;
    profile.value = null;
    useCheckoutDraftStore().clearOrderContext();
  }

  tokenStorage.onChange(() => {
    if (!tokenStorage.getAccess()) {
      clearSessionState();
    }
  });

  /** 保存令牌对并标记为已登录 */
  function acceptTokens(tokens: TokenPair): void {
    tokenStorage.save(tokens);
    authed.value = true;
  }

  /** 短信验证码登录，成功后拉取资料 */
  async function smsLogin(payload: SmsLoginPayload): Promise<void> {
    acceptTokens(await authApi.smsLogin(payload));
    await loadProfile();
  }

  /** 短信验证码注册，成功即自动登录并拉取资料 */
  async function smsRegister(payload: SmsRegisterPayload): Promise<void> {
    acceptTokens(await authApi.smsRegister(payload));
    await loadProfile();
  }

  /** 加载当前用户资料；令牌失效时清空登录态 */
  async function loadProfile(): Promise<void> {
    try {
      profile.value = await authApi.profile();
    } catch {
      logout();
    }
  }

  /** 登出：清空令牌与内存资料 */
  function logout(): void {
    tokenStorage.clear();
    clearSessionState();
  }

  return { isAuthenticated, profile, smsLogin, smsRegister, loadProfile, logout };
});
