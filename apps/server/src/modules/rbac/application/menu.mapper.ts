import { MenuView } from '@app/contracts';
import { Permission } from '../domain/permission.entity';

/** menu 类型权限实体 → 菜单视图 */
export function toMenuView(permission: Permission): MenuView {
  return {
    code: permission.code,
    title: permission.name,
    path: permission.path ?? '',
    icon: permission.icon,
    sort: permission.sort,
  };
}
