import type { AuthProfile, SmsLoginPayload, SmsRegisterPayload } from '@app/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '@/api/auth.api';
import { tokenStorage } from '@/api/token-storage';

/**
 * 用户端鉴权状态。
 * 负责令牌生命周期与当前用户档案；登录/注册均走短信验证码，成功后立即拉取档案。
 */
export const useAuthStore = defineStore('auth', () => {
  const profile = ref<AuthProfile | null>(null);
  const loaded = ref(false);

  const isAuthenticated = computed(() => Boolean(tokenStorage.getAccess()));
  /** 展示用昵称：优先昵称，退化到用户名 */
  const displayName = computed(() => profile.value?.nickname || profile.value?.username || '');

  async function smsLogin(payload: SmsLoginPayload): Promise<void> {
    const pair = await authApi.smsLogin(payload);
    tokenStorage.save(pair);
    await loadProfile();
  }

  async function smsRegister(payload: SmsRegisterPayload): Promise<void> {
    const pair = await authApi.smsRegister(payload);
    tokenStorage.save(pair);
    await loadProfile();
  }

  async function loadProfile(): Promise<AuthProfile> {
    const data = await authApi.profile();
    profile.value = data;
    loaded.value = true;
    return data;
  }

  function logout(): void {
    tokenStorage.clear();
    profile.value = null;
    loaded.value = false;
  }

  return {
    profile,
    loaded,
    isAuthenticated,
    displayName,
    smsLogin,
    smsRegister,
    loadProfile,
    logout,
  };
});
