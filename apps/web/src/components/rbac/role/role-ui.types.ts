/** 角色表单仅承载前端弹窗编辑态。 */
export interface RoleForm {
  code: string;
  name: string;
  remark: string;
  /** 所属租户主键；仅平台超管新建时可选择 */
  tenantId: string;
}
