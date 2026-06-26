import type { MenuView } from '@app/contracts';
import { http } from './http';

/** 菜单接口：菜单由后端按当前用户权限下发，前端不再维护静态菜单清单 */
export const menuApi = {
  /** 获取当前登录用户的可见菜单（超管全量，其余按所授权限过滤） */
  mine(): Promise<MenuView[]> {
    return http.get('/rbac/menus/mine');
  },
};
