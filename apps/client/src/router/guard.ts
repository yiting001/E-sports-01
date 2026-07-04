import type { Router } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 全局前置守卫。
 * 1) 未登录访问受保护页 → 跳登录并带上 redirect；
 * 2) 已登录再访问登录页 → 回首页；
 * 3) 已登录但档案未加载 → 先补全 profile，失败则登出回登录。
 */
export function registerGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();

    if (to.meta.public) {
      return auth.isAuthenticated && to.name === 'login' ? { name: 'home' } : true;
    }

    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }

    if (!auth.loaded) {
      try {
        await auth.loadProfile();
      } catch {
        auth.logout();
        return { name: 'login', query: { redirect: to.fullPath } };
      }
    }

    return true;
  });
}
