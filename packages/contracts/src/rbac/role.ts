/** 角色对外视图 */
export interface RoleView {
  id: string;
  code: string;
  name: string;
  remark: string;
  /** 关联的权限 id 集合 */
  permissionIds: string[];
  createdAt: string;
}
