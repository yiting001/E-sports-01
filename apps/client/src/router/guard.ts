import type { Router } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 注册全局前置守卫：登录态与目标路由的可访问性判定。
 * - 访问带 requiresAuth 的页面但未登录 → 跳登录页并带 redirect 回跳地址；
 * - 已登录再访问登录页 → 直接回首页，避免重复登录。
 * 判定逻辑集中一处，路由表只声明 meta.requiresAuth，互不耦合。
 */
export function registerAuthGuard(router: Router): void {
  router.beforeEach((to) => {
    const auth = useAuthStore();

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }

    if (to.name === 'login' && auth.isAuthenticated) {
      return { name: 'home' };
    }

    return true;
  });
}
