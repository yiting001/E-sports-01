/** 单个用户可绑定的角色数量上限（支持多角色，如同时为用户与打手） */
export const USER_ROLES_MAX = 20;

/** 角色对外视图 */
export interface RoleView {
  id: string;
  code: string;
  name: string;
  remark: string;
  /** 所属租户主键（平台超管跨租户列表时区分归属） */
  tenantId: string;
  /** 关联的权限 id 集合 */
  permissionIds: string[];
  /** 是否内置超级管理员：为真时拥有全部权限，无需也无法单独分配 */
  isSuper: boolean;
  createdAt: string;
}
