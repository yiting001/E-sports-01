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
/** 已软删除角色分类（回收站，可恢复） */
export const ROLE_CATEGORY_DELETED = 'deleted';

/** 下拉项 */
export interface RoleCodeOption {
  value: string;
  label: string;
}

/** 内置编码下拉项 */
export const BUILTIN_ROLE_CODE_OPTIONS: readonly RoleCodeOption[] = BUILTIN_ROLE_OPTIONS.map(
  (item) => ({ value: item.code, label: `${item.label}（${item.code}）` }),
);

/** 角色编码分类下拉项：全部 / 各内置编码 / 自定义角色 / 已删除 */
export const ROLE_CATEGORY_OPTIONS: readonly RoleCodeOption[] = [
  { value: ROLE_CATEGORY_ALL, label: '全部角色' },
  ...BUILTIN_ROLE_CODE_OPTIONS,
  { value: ROLE_CATEGORY_CUSTOM, label: '自定义角色' },
  { value: ROLE_CATEGORY_DELETED, label: '已删除（可恢复）' },
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
  } else if (filter.category === ROLE_CATEGORY_DELETED) {
    query.kind = 'deleted';
  } else if (filter.category !== ROLE_CATEGORY_ALL) {
    query.code = filter.category;
  }
  return query;
}

/** 内置角色编码的展示名；非内置编码返回空串 */
export function builtinRoleLabel(code: string): string {
  return BUILTIN_ROLE_OPTIONS.find((item) => item.code === code)?.label ?? '';
}

/** 编码下拉项：内置编码 + 当前已填/编辑中的自定义编码（避免编辑态只显示裸值） */
export function roleCodeOptions(current: string): RoleCodeOption[] {
  const code = current.trim();
  if (!code || builtinRoleLabel(code)) {
    return [...BUILTIN_ROLE_CODE_OPTIONS];
  }
  return [{ value: code, label: `自定义（${code}）` }, ...BUILTIN_ROLE_CODE_OPTIONS];
}

/** 选择/输入编码后的表单态：去空白，选内置编码且名称为空时自动带出内置名称 */
export function applyRoleCode(form: RoleForm, value: string | null): RoleForm {
  const code = (value ?? '').trim();
  const name = form.name.trim() ? form.name : builtinRoleLabel(code);
  return { ...form, code, name };
}
