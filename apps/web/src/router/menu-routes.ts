import type { Router } from 'vue-router';
import type { MenuView } from '@app/contracts';
import { LAYOUT_ROUTE_NAME, menuToRoute } from './routes';

/** 已动态注册的菜单路由名，供重新同步时先行清理，避免跨用户残留 */
const registered = new Set<string>();

/** 拉平菜单树为列表（菜单当前为扁平结构，预留层级时一并展开注册路由） */
function flattenMenus(menus: MenuView[]): MenuView[] {
  return menus.flatMap((menu) => [menu, ...flattenMenus(menu.children ?? [])]);
}

/**
 * 依据后端下发的菜单，重建挂载于 AppLayout 之下的动态业务路由。
 * 先移除上次注册的路由再按当前菜单重新注册，确保切换用户后路由与权限一致。
 */
export function syncMenuRoutes(router: Router, menus: MenuView[]): void {
  for (const name of registered) {
    if (router.hasRoute(name)) {
      router.removeRoute(name);
    }
  }
  registered.clear();

  for (const menu of flattenMenus(menus)) {
    const route = menuToRoute(menu);
    if (route && route.name) {
      router.addRoute(LAYOUT_ROUTE_NAME, route);
      registered.add(route.name as string);
    }
  }
}
