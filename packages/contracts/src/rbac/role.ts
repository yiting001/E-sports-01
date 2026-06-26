/** 角色对外视图 */
export interface RoleView {
  id: string;
  code: string;
  name: string;
  remark: string;
  /** 关联的权限 id 集合 */
  permissionIds: string[];
  /** 是否内置超级管理员：为真时拥有全部权限，无需也无法单独分配 */
  isSuper: boolean;
  createdAt: string;
}
