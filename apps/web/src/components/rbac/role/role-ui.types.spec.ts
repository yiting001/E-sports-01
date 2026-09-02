import { describe, expect, it } from 'vitest';
import {
  ROLE_CATEGORY_ALL,
  ROLE_CATEGORY_CUSTOM,
  ROLE_CATEGORY_DELETED,
  ROLE_CATEGORY_OPTIONS,
  applyRoleCode,
  builtinRoleLabel,
  roleCodeOptions,
  toRoleListQuery,
} from './role-ui.types';

const BUILTIN_CODES = ['admin', 'tenant_admin', 'member', 'service', 'booster'];

describe('角色列表筛选转换', () => {
  it('全部分类且关键词为空白时不产生任何筛选参数', () => {
    expect(toRoleListQuery({ keyword: '   ', category: ROLE_CATEGORY_ALL })).toEqual({});
  });

  it('关键词去除首尾空白后作为名称/编码搜索', () => {
    expect(toRoleListQuery({ keyword: ' 客服 ', category: ROLE_CATEGORY_ALL })).toEqual({
      keyword: '客服',
    });
  });

  it('选择内置编码分类时按编码精确筛选', () => {
    expect(toRoleListQuery({ keyword: '', category: 'tenant_admin' })).toEqual({
      code: 'tenant_admin',
    });
  });

  it('选择自定义角色分类时按 kind=custom 筛选', () => {
    expect(toRoleListQuery({ keyword: '运营', category: ROLE_CATEGORY_CUSTOM })).toEqual({
      keyword: '运营',
      kind: 'custom',
    });
  });

  it('选择已删除分类时按 kind=deleted 查回收站', () => {
    expect(toRoleListQuery({ keyword: '', category: ROLE_CATEGORY_DELETED })).toEqual({
      kind: 'deleted',
    });
  });

  it('分类下拉覆盖全部内置编码并附带自定义、已删除选项', () => {
    const values = ROLE_CATEGORY_OPTIONS.map((option) => option.value);
    expect(values).toEqual([
      ROLE_CATEGORY_ALL,
      'admin',
      'tenant_admin',
      'member',
      'service',
      'booster',
      ROLE_CATEGORY_CUSTOM,
      ROLE_CATEGORY_DELETED,
    ]);
    expect(builtinRoleLabel('booster')).toBe('打手');
    expect(builtinRoleLabel('operator')).toBe('');
  });
});

describe('角色编码下拉', () => {
  const form = { code: '', name: '', remark: '', tenantId: '' };

  it('空值或内置编码只列出内置选项', () => {
    expect(roleCodeOptions('').map((o) => o.value)).toEqual(BUILTIN_CODES);
    expect(roleCodeOptions('member').map((o) => o.value)).toEqual(BUILTIN_CODES);
  });

  it('自定义编码置顶作为当前选项，保证编辑态可展示', () => {
    expect(roleCodeOptions(' operator ')[0]).toEqual({
      value: 'operator',
      label: '自定义（operator）',
    });
    expect(roleCodeOptions('operator')).toHaveLength(BUILTIN_CODES.length + 1);
  });

  it('选中内置编码且名称为空时自动带出名称', () => {
    expect(applyRoleCode(form, 'service')).toEqual({ ...form, code: 'service', name: '客服' });
  });

  it('已填名称不被覆盖，自定义编码去除空白且不补名称', () => {
    expect(applyRoleCode({ ...form, name: '售后' }, 'service').name).toBe('售后');
    expect(applyRoleCode(form, ' operator ')).toEqual({ ...form, code: 'operator' });
  });

  it('清空选择时编码置空', () => {
    expect(applyRoleCode({ ...form, code: 'member', name: '普通用户' }, null)).toEqual({
      ...form,
      code: '',
      name: '普通用户',
    });
  });
});
