import { MENU_DEFINITIONS, PermissionType } from '@app/contracts';
import { Permission } from './permission.entity';

/**
 * 由共享的菜单清单 MENU_DEFINITIONS 生成 menu 类型权限的播种数据。
 * 菜单与前端路由同源（contracts 单一来源），避免“库里的菜单”与“前端路由”漂移。
 */
export const DEFAULT_MENU_PERMISSIONS: Array<Partial<Permission> & { code: string }> =
  MENU_DEFINITIONS.map((menu) => ({
    code: menu.code,
    name: menu.title,
    type: PermissionType.Menu,
    path: menu.path,
    icon: menu.icon,
    sort: menu.sort,
  }));
