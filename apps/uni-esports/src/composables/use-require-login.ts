import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 页面级登录守卫。
 * Tab 页（消息/我的）在未登录时展示「去登录」引导而非强制跳转，
 * 功能子页（结算/钱包/聊天等）用 ensureLoggedIn 直接跳登录页。
 */
export function useRequireLogin(redirect = true) {
  const auth = useAuthStore();

  function gotoLogin(): void {
    uni.navigateTo({ url: '/pages/login/login' });
  }

  /** 页面 onShow 调用：未登录时跳转登录页（redirect=true）或交由页面展示引导 */
  function ensureLoggedIn(): boolean {
    if (auth.isLoggedIn) {
      return true;
    }
    if (redirect) {
      gotoLogin();
    }
    return false;
  }

  /** 供 onShow 使用：注册后立即执行一次守卫 */
  onShow(() => {
    void auth.restoreProfile();
    ensureLoggedIn();
  });

  return { auth, ensureLoggedIn, gotoLogin };
}
