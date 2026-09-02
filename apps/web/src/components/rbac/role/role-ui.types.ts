import type { RoleListQuery } from '@app/contracts';
import { BUILTIN_ROLE_OPTIONS } from '@app/contracts';

/** 角色表单仅承载前端弹窗编辑态。 */
export interface RoleForm {
  code: string;
  name: string;
  remark: string;
  /** 所属租户主键；仅平台超管新建时可选择 */
  tenantId: string;
}

/** 全部分类 */
export const ROLE_CATEGORY_ALL = '';
/** 自定义（非内置编码）角色分类 */
export const ROLE_CATEGORY_CUSTOM = 'custom';

/** 角色编码分类下拉项：全部 / 各内置编码 / 自定义角色 */
export const ROLE_CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: ROLE_CATEGORY_ALL, label: '全部角色' },
  ...BUILTIN_ROLE_OPTIONS.map((item) => ({
    value: item.code,
    label: `${item.label}（${item.code}）`,
  })),
  { value: ROLE_CATEGORY_CUSTOM, label: '自定义角色' },
];

/** 角色列表筛选态 */
export interface RoleFilter {
  keyword: string;
  category: string;
}

/** 把页面筛选态转换为列表接口查询参数 */
export function toRoleListQuery(filter: RoleFilter): RoleListQuery {
  const keyword = filter.keyword.trim();
  const query: RoleListQuery = keyword ? { keyword } : {};
  if (filter.category === ROLE_CATEGORY_CUSTOM) {
    query.kind = 'custom';
  } else if (filter.category !== ROLE_CATEGORY_ALL) {
    query.code = filter.category;
  }
  return query;
}

/** 内置角色编码的展示名；非内置编码返回空串 */
export function builtinRoleLabel(code: string): string {
  return BUILTIN_ROLE_OPTIONS.find((item) => item.code === code)?.label ?? '';
}
