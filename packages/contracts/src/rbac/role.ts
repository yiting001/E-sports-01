import { BOOSTER_ROLE_CODE } from '../booster/booster';

/** 单个用户可绑定的角色数量上限（支持多角色，如同时为用户与打手） */
export const USER_ROLES_MAX = 20;

/** 内置角色编码及展示名：由系统播种/领域流程维护，也允许平台超管通过角色管理补建。 */
export const BUILTIN_ROLE_OPTIONS = [
  { code: 'admin', label: '超级管理员' },
  { code: 'tenant_admin', label: '租户管理员' },
  { code: 'member', label: '普通用户' },
  { code: 'service', label: '客服' },
  { code: BOOSTER_ROLE_CODE, label: '打手' },
] as const;

/** 内置角色编码集合 */
export const BUILTIN_ROLE_CODES: readonly string[] = BUILTIN_ROLE_OPTIONS.map(
  (item) => item.code,
);

/** 角色分类：内置角色 / 自定义角色 / 已软删除角色（回收站） */
export type RoleKind = 'builtin' | 'custom' | 'deleted';

/** 角色列表筛选条件 */
export interface RoleListQuery {
  /** 按名称/编码模糊搜索 */
  keyword?: string;
  /** 按角色编码精确筛选（内置编码分类查看） */
  code?: string;
  /** 按角色分类筛选 */
  kind?: RoleKind;
}

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
  /** 是否内置角色编码（admin/tenant_admin/member/service/booster） */
  isBuiltin: boolean;
  /** 是否允许删除：仅默认租户的平台超管角色不可删除 */
  deletable: boolean;
  /** 软删除时间；未删除为 null */
  deletedAt: string | null;
  createdAt: string;
}
