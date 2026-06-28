import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { MENU_DEFINITIONS, MENU_GROUPS } from '@app/contracts';
import { useMenuStore } from '@/stores/menu.store';

/** 侧边菜单项：分组节点含 children 无 path，叶子节点含 path 可路由 */
export interface MenuItem {
  /** 唯一键（分组用 group:<code>，叶子用菜单 code） */
  key: string;
  title: string;
  icon?: string;
  /** 叶子菜单的路由路径；分组节点无 */
  path?: string;
  children?: MenuItem[];
}

/** 工作台首页：登录即可见，不受菜单权限控制，恒置于菜单首位 */
const DASHBOARD_MENU: MenuItem = { key: 'dashboard', path: '/dashboard', title: '工作台', icon: 'HomeFilled' };

/** 菜单 code → 所属分组 code（取自 contracts 单一来源） */
const CODE_TO_GROUP = new Map(MENU_DEFINITIONS.map((m) => [m.code, m.group]));

/**
 * 当前用户可见菜单（已按分组收纳成树）。
 * 数据源为后端按权限下发的菜单（menuStore，决定「可见哪些叶子」），
 * 分组结构取自 contracts 的 MENU_GROUPS（决定「如何收纳」）；
 * 某分组无任何可见子菜单时整组不渲染，故角色无权时分组自然隐藏。
 */
export function useMenus() {
  const { menus: backendMenus } = storeToRefs(useMenuStore());

  const menus = computed<MenuItem[]>(() => {
    const groupChildren = new Map<string, MenuItem[]>();
    const topLevel: { item: MenuItem; sort: number }[] = [];

    for (const menu of backendMenus.value) {
      const leaf: MenuItem = {
        key: menu.code,
        path: `/${menu.path}`,
        title: menu.title,
        icon: menu.icon ?? undefined,
      };
      const groupCode = CODE_TO_GROUP.get(menu.code);
      if (groupCode) {
        const siblings = groupChildren.get(groupCode) ?? [];
        siblings.push(leaf);
        groupChildren.set(groupCode, siblings);
      } else {
        topLevel.push({ item: leaf, sort: menu.sort });
      }
    }

    for (const group of MENU_GROUPS) {
      const children = groupChildren.get(group.code);
      if (!children?.length) continue;
      topLevel.push({
        item: { key: `group:${group.code}`, title: group.title, icon: group.icon, children },
        sort: group.sort,
      });
    }

    topLevel.sort((a, b) => a.sort - b.sort);
    return [DASHBOARD_MENU, ...topLevel.map((entry) => entry.item)];
  });

  return { menus };
}
