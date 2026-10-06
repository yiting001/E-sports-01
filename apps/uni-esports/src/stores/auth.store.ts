import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { AuthProfile, SmsLoginPayload } from '@app/contracts';
import { authApi } from '@/api/auth.api';
import { onAuthExpired } from '@/api/http';
import { tokenStorage } from '@/api/token-storage';

/**
 * 登录态与用户资料（跨页面共享）。
 * 令牌持久化在 token-storage；登出/令牌过期统一在此清理，
 * 页面只读取 isLoggedIn 与 profile。
 */
export const useAuthStore = defineStore('auth', () => {
  const profile = ref<AuthProfile | null>(null);
  const isLoggedIn = ref(tokenStorage.getAccess() !== '');

  const displayName = computed(() => {
    const p = profile.value;
    return p?.nickname || p?.phone || '用户';
  });

  async function loadProfile(): Promise<void> {
    profile.value = await authApi.profile();
  }

  /** 短信验证码登录（首登自动注册）；成功后拉取资料，失败向上抛出由页面提示 */
  async function smsLogin(payload: SmsLoginPayload): Promise<boolean> {
    const result = await authApi.smsLogin(payload);
    tokenStorage.save(result);
    isLoggedIn.value = true;
    await loadProfile();
    return result.registered;
  }

  /** 恢复会话：冷启动已有令牌时刷新资料，失败按令牌过期处理 */
  async function restoreProfile(): Promise<void> {
    if (!isLoggedIn.value) {
      return;
    }
    try {
      await loadProfile();
    } catch {
      if (tokenStorage.getAccess() === '') {
        isLoggedIn.value = false;
        profile.value = null;
      }
    }
  }

  function clearSession(): void {
    tokenStorage.clear();
    isLoggedIn.value = false;
    profile.value = null;
  }

  function logout(): void {
    clearSession();
  }

  onAuthExpired(() => {
    isLoggedIn.value = false;
    profile.value = null;
    if (tokenStorage.getAccess() !== '') {
      tokenStorage.clear();
    }
  });

  return {
    profile,
    isLoggedIn,
    displayName,
    smsLogin,
    loadProfile,
    restoreProfile,
    logout,
  };
});
