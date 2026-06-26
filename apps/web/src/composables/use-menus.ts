import { computed } from 'vue';
import { businessRoutes } from '@/router/routes';
import { useAuthStore } from '@/stores/auth.store';

/** 侧边菜单项（由带 title 的业务路由按权限过滤而来） */
export interface MenuItem {
  path: string;
  title: string;
  icon?: string;
}

/**
 * 从业务路由表派生当前用户可见菜单。
 * 路由表是菜单的唯一数据源：无 permission 的菜单始终可见，
 * 有 permission 的需命中权限码，从而与 v-permission/后端鉴权保持一致。
 */
export function useMenus() {
  const auth = useAuthStore();

  const menus = computed<MenuItem[]>(() =>
    businessRoutes
      .filter((route) => Boolean(route.meta?.title))
      .filter((route) => {
        const required = route.meta?.permission;
        return !required || auth.hasPermission(required);
      })
      .map((route) => ({
        path: `/${route.path}`,
        title: route.meta!.title!,
        icon: route.meta?.icon,
      })),
  );

  return { menus };
}
