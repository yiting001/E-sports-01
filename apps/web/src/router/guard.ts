import type { Router } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useMenuStore } from '@/stores/menu.store';
import { syncMenuRoutes } from './menu-routes';

/**
 * 全局前置守卫。
 * 1) 未登录访问受保护页 → 跳登录；2) 已登录未拉档案 → 先补全 profile；
 * 3) 菜单未加载 → 拉取后端菜单并注册动态路由，再重解析当前导航；
 * 4) 命中 meta.permission 但无权限 → 回工作台，避免进入空白受限页。
 */
export function registerGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    const menuStore = useMenuStore();

    if (to.meta.public) {
      return auth.isAuthenticated && to.name === 'login' ? { name: 'dashboard' } : true;
    }

    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }

    if (!auth.loaded) {
      try {
        await auth.loadProfile();
      } catch {
        auth.logout();
        menuStore.reset();
        return { name: 'login', query: { redirect: to.fullPath } };
      }
    }

    if (!menuStore.loaded) {
      try {
        const menus = await menuStore.load();
        syncMenuRoutes(router, menus);
        return to.redirectedFrom?.fullPath ?? to.fullPath;
      } catch {
        return true;
      }
    }

    const required = to.meta.permission;
    if (required && !auth.hasPermission(required)) {
      return { name: 'dashboard' };
    }

    return true;
  });
}
