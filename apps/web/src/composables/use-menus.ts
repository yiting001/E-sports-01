import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useMenuStore } from '@/stores/menu.store';

/** 侧边菜单项 */
export interface MenuItem {
  path: string;
  title: string;
  icon?: string;
}

/** 工作台首页：登录即可见，不受菜单权限控制，恒置于菜单首位 */
const DASHBOARD_MENU: MenuItem = { path: '/dashboard', title: '工作台', icon: 'HomeFilled' };

/**
 * 当前用户可见菜单。
 * 数据源为后端按权限下发的菜单（menuStore），前端不再维护静态菜单清单；
 * 角色未授予某菜单权限时后端不下发该菜单，故此处自然不渲染。
 */
export function useMenus() {
  const { menus: backendMenus } = storeToRefs(useMenuStore());

  const menus = computed<MenuItem[]>(() => [
    DASHBOARD_MENU,
    ...backendMenus.value.map((menu) => ({
      path: `/${menu.path}`,
      title: menu.title,
      icon: menu.icon ?? undefined,
    })),
  ]);

  return { menus };
}
