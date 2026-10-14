import { computed, readonly, ref } from 'vue';
import { authApi } from '@/api/auth.api';
import { onAuthExpired } from '@/api/http';
import { tokenStorage } from '@/api/token-storage';
import type { AuthProfile, SmsLoginPayload, UpdateProfilePayload, UserView } from '@/types/auth';
import { im } from './im';
import { member } from './member';
import { wallet } from './wallet';

/**
 * 登录态与用户资料（跨页面共享）。
 * 单一职责：维护登录标记与内存资料，封装短信登录、资料加载与登出；
 * 令牌持久化交给 tokenStorage，令牌失效由 http 层的 onAuthExpired 回调统一清理。
 * 说明：本工程暂未接入 Pinia，用模块级响应式状态承担同等职责。
 */

const profileRef = ref<AuthProfile | null>(null);
const isLoggedInRef = ref(tokenStorage.getAccess() !== '');

const displayName = computed(
  () => profileRef.value?.nickname || profileRef.value?.phone || '用户',
);

function clearSession(): void {
  isLoggedInRef.value = false;
  profileRef.value = null;
  member.reset();
  wallet.reset();
  im.disconnect();
}

/** 加载当前用户资料；登录态已失效时清空内存资料 */
async function loadProfile(): Promise<void> {
  try {
    profileRef.value = await authApi.profile();
  } catch (error) {
    if (tokenStorage.getAccess() === '') {
      clearSession();
    }
    throw error;
  }
}

/** 短信验证码登录（登录注册合一）：成功后写令牌并拉取资料，返回是否首登自动注册 */
async function smsLogin(payload: SmsLoginPayload): Promise<{ registered: boolean }> {
  const result = await authApi.smsLogin(payload);
  tokenStorage.save(result);
  isLoggedInRef.value = true;
  await loadProfile();
  // 登录后建立 IM 长连接（客服/订单群实时消息）
  im.ensureConnected();
  return { registered: result.registered };
}

/** 自助更新本人资料（昵称/头像），成功后同步内存资料 */
async function updateProfile(payload: UpdateProfilePayload): Promise<UserView> {
  const updated = await authApi.updateProfile(payload);
  if (profileRef.value) {
    profileRef.value = { ...profileRef.value, nickname: updated.nickname, avatar: updated.avatar };
  }
  return updated;
}

/** 页面 onShow 调用：按本地令牌恢复登录态并刷新资料（失败静默，不打断浏览） */
async function restore(): Promise<void> {
  isLoggedInRef.value = tokenStorage.getAccess() !== '';
  if (!isLoggedInRef.value) {
    profileRef.value = null;
    return;
  }
  try {
    await loadProfile();
  } catch {
    // 令牌失效已由 http 层清理并提示；这里只同步状态
    isLoggedInRef.value = tokenStorage.getAccess() !== '';
    if (!isLoggedInRef.value) {
      clearSession();
    }
  }
}

/** 登出：清空令牌与内存资料（会员/钱包状态一并复位） */
function logout(): void {
  tokenStorage.clear();
  clearSession();
}

onAuthExpired(() => {
  clearSession();
});

export const auth = {
  profile: readonly(profileRef),
  isLoggedIn: readonly(isLoggedInRef),
  displayName,
  smsLogin,
  loadProfile,
  updateProfile,
  restore,
  logout,
};
