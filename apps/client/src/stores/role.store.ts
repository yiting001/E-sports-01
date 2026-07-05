import { BOOSTER_ROLE_CODE } from '@app/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useAuthStore } from './auth.store';

/** C 端可切换的登录身份 */
export type ActiveRole = 'user' | 'booster';

/** 身份持久化键（刷新后保持上次选择） */
const STORAGE_KEY = 'esports.active-role';

/**
 * C 端身份切换状态。
 * 单一职责：维护当前激活身份（老板/打手）并持久化到本地。
 * 是否具备打手身份由 auth.store 的角色码派生；无打手角色时强制回退老板身份。
 */
export const useRoleStore = defineStore('role', () => {
  const auth = useAuthStore();

  const stored = localStorage.getItem(STORAGE_KEY);
  const activeRole = ref<ActiveRole>(stored === 'booster' ? 'booster' : 'user');

  /** 当前账号是否拥有打手角色 */
  const hasBoosterRole = computed(
    () => auth.profile?.roles.includes(BOOSTER_ROLE_CODE) === true,
  );

  /** 当前是否处于打手身份（需实际拥有打手角色） */
  const isBoosterMode = computed(
    () => activeRole.value === 'booster' && hasBoosterRole.value,
  );

  /** 切换身份并持久化 */
  function switchRole(role: ActiveRole): void {
    activeRole.value = role;
    localStorage.setItem(STORAGE_KEY, role);
  }

  return { activeRole, hasBoosterRole, isBoosterMode, switchRole };
});
