import assert from 'node:assert/strict';
import test from 'node:test';
import type { RoleListQuery } from '@app/contracts';
import { FindOperator } from 'typeorm';
import { ListRolesUseCase } from '../../src/modules/rbac/application/use-cases/list-roles.usecase';
import { RESERVED_ROLE_CODES } from '../../src/modules/rbac/domain/rbac.constants';
import { Role } from '../../src/modules/rbac/domain/role.entity';
import type { RoleRepository } from '../../src/modules/rbac/domain/role-repository.interface';
import { buildRoleListWhere } from '../../src/modules/rbac/infrastructure/role.repository';

function operator(value: unknown): FindOperator<unknown> {
  assert.ok(value instanceof FindOperator, '应为 TypeORM 查询操作符');
  return value;
}

test('无筛选条件时只返回空 where，交给租户作用域处理', () => {
  assert.deepEqual(buildRoleListWhere({}), [{}]);
});

test('仅关键词时对名称与编码取并集模糊匹配', () => {
  const clauses = buildRoleListWhere({ keyword: '客服' });

  assert.equal(clauses.length, 2);
  assert.equal(operator(clauses[0].name).type, 'ilike');
  assert.equal(operator(clauses[0].name).value, '%客服%');
  assert.equal(operator(clauses[1].code).value, '%客服%');
});

test('按编码精确筛选时关键词只匹配名称，避免编码条件被并集冲掉', () => {
  const clauses = buildRoleListWhere({ code: 'service', keyword: '客' });

  assert.deepEqual(clauses.map((clause) => clause.code), ['service']);
  assert.equal(operator(clauses[0].name).value, '%客%');
});

test('内置/自定义分类分别映射为 In / Not In 内置编码集合', () => {
  const builtin = operator(buildRoleListWhere({ kind: 'builtin' })[0].code);
  assert.equal(builtin.type, 'in');
  assert.deepEqual(builtin.value, [...RESERVED_ROLE_CODES]);

  const custom = operator(buildRoleListWhere({ kind: 'custom' })[0].code);
  assert.equal(custom.type, 'not');
  const inner = operator(custom.child);
  assert.equal(inner.type, 'in');
  assert.deepEqual(inner.value, [...RESERVED_ROLE_CODES]);
});

test('同时传入 code 与 kind 时以精确编码为准', () => {
  assert.deepEqual(buildRoleListWhere({ code: 'operator', kind: 'builtin' }), [
    { code: 'operator' },
  ]);
});

test('列表用例把筛选条件原样传给仓储并映射内置标记', async () => {
  let received: RoleListQuery | undefined;
  const role = Object.assign(new Role(), {
    id: 'role-1',
    tenantId: 'tenant-a',
    code: 'booster',
    name: '打手',
    remark: '',
    permissions: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  const repo: Pick<RoleRepository, 'paginate'> = {
    paginate: async (_skip, _take, filter) => {
      received = filter;
      return [[role], 1];
    },
  };
  const useCase = new ListRolesUseCase(repo as RoleRepository);

  const result = await useCase.execute(1, 20, 0, { keyword: '打', kind: 'builtin' });

  assert.deepEqual(received, { keyword: '打', kind: 'builtin' });
  assert.equal(result.total, 1);
  assert.equal(result.list[0].isBuiltin, true);
  assert.equal(result.list[0].isSuper, false);
});
