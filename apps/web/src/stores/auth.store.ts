import type {
  AuthProfile,
  LoginPayload,
  RegisterPayload,
  SmsLoginPayload,
} from '@app/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '@/api/auth.api';
import { tokenStorage } from '@/api/token-storage';

/**
 * 鉴权状态。
 * 负责令牌生命周期与当前用户档案，并向上层暴露按钮级权限判断 hasPermission。
 * 权限码集合来源于后端 /auth/profile，前端不维护第二份权限定义。
 */
export const useAuthStore = defineStore('auth', () => {
  const profile = ref<AuthProfile | null>(null);
  const loaded = ref(false);

  const isAuthenticated = computed(() => Boolean(tokenStorage.getAccess()));
  const permissions = computed(() => new Set(profile.value?.permissions ?? []));

  /** 按钮级鉴权：超管直接放行，其余按扁平权限码集合判断 */
  function hasPermission(code: string): boolean {
    return profile.value?.isSuper === true || permissions.value.has(code);
  }

  async function login(payload: LoginPayload): Promise<void> {
    const pair = await authApi.login(payload);
    tokenStorage.save(pair);
    await loadProfile();
  }

  async function register(payload: RegisterPayload): Promise<void> {
    const pair = await authApi.register(payload);
    tokenStorage.save(pair);
    await loadProfile();
  }

  async function smsLogin(payload: SmsLoginPayload): Promise<void> {
    const pair = await authApi.smsLogin(payload);
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
    permissions,
    hasPermission,
    login,
    register,
    smsLogin,
    loadProfile,
    logout,
  };
});
