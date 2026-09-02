import { describe, expect, it } from 'vitest';
import {
  ROLE_CATEGORY_ALL,
  ROLE_CATEGORY_CUSTOM,
  ROLE_CATEGORY_OPTIONS,
  builtinRoleLabel,
  toRoleListQuery,
} from './role-ui.types';

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

  it('分类下拉覆盖全部内置编码并附带自定义选项', () => {
    const values = ROLE_CATEGORY_OPTIONS.map((option) => option.value);
    expect(values).toEqual([
      ROLE_CATEGORY_ALL,
      'admin',
      'tenant_admin',
      'member',
      'service',
      'booster',
      ROLE_CATEGORY_CUSTOM,
    ]);
    expect(builtinRoleLabel('booster')).toBe('打手');
    expect(builtinRoleLabel('operator')).toBe('');
  });
});
