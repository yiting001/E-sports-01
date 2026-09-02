import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DEFAULT_TENANT_ID } from '@app/contracts';
import type { RoleListQuery } from '@app/contracts';
import { RemoveRoleUseCase } from '../../src/modules/rbac/application/use-cases/remove-role.usecase';
import { RestoreRoleUseCase } from '../../src/modules/rbac/application/use-cases/restore-role.usecase';
import { PermissionResolver } from '../../src/modules/rbac/application/permission-resolver.service';
import {
  RESERVED_ROLE_CODES,
  SUPER_ADMIN_ROLE,
} from '../../src/modules/rbac/domain/rbac.constants';
import { Role } from '../../src/modules/rbac/domain/role.entity';
import type { RoleRepository } from '../../src/modules/rbac/domain/role-repository.interface';

/** 内存仓储：模拟 TypeORM 软删除语义，默认读操作自动排除 deletedAt 非空的行 */
class MemoryRoleRepository implements RoleRepository {
  private readonly roles = new Map<string, Role>();

  constructor(initial: Role[]) {
    for (const role of initial) {
      this.roles.set(role.id, role);
    }
  }

  private alive(): Role[] {
    return [...this.roles.values()].filter((role) => role.deletedAt === null);
  }

  findById(id: string): Promise<Role | null> {
    return Promise.resolve(this.alive().find((role) => role.id === id) ?? null);
  }

  findByIds(ids: string[]): Promise<Role[]> {
    return Promise.resolve(this.alive().filter((role) => ids.includes(role.id)));
  }

  findByCode(code: string): Promise<Role | null> {
    return Promise.resolve(this.alive().find((role) => role.code === code) ?? null);
  }

  findByCodeForTenant(code: string, tenantId: string): Promise<Role | null> {
    return Promise.resolve(
      this.alive().find((role) => role.code === code && role.tenantId === tenantId) ?? null,
    );
  }

  existsByCodeForTenantWithDeleted(code: string, tenantId: string): Promise<boolean> {
    return Promise.resolve(
      [...this.roles.values()].some((role) => role.code === code && role.tenantId === tenantId),
    );
  }

  findDeletedById(id: string): Promise<Role | null> {
    const role = this.roles.get(id);
    return Promise.resolve(role && role.deletedAt !== null ? role : null);
  }

  findAllOutsideTenant(tenantId: string): Promise<Role[]> {
    return Promise.resolve(this.alive().filter((role) => role.tenantId !== tenantId));
  }

  existsByCode(code: string): Promise<boolean> {
    return Promise.resolve(this.alive().some((role) => role.code === code));
  }

  paginate(skip: number, take: number, filter: RoleListQuery = {}): Promise<[Role[], number]> {
    const keyword = filter.keyword;
    const source =
      filter.kind === 'deleted'
        ? [...this.roles.values()].filter((role) => role.deletedAt !== null)
        : this.alive();
    const found = source.filter(
      (role) => !keyword || role.code.includes(keyword) || role.name.includes(keyword),
    );
    return Promise.resolve([found.slice(skip, skip + take), found.length]);
  }

  create(data: Partial<Role>): Role {
    return Object.assign(new Role(), data);
  }

  save(role: Role): Promise<Role> {
    this.roles.set(role.id, role);
    return Promise.resolve(role);
  }

  remove(id: string): Promise<void> {
    const role = this.roles.get(id);
    if (role) {
      role.deletedAt = new Date();
    }
    return Promise.resolve();
  }

  restore(id: string): Promise<void> {
    const role = this.roles.get(id);
    if (role) {
      role.deletedAt = null;
    }
    return Promise.resolve();
  }

  has(id: string): boolean {
    return this.roles.has(id);
  }
}

function createResolver(): PermissionResolver {
  return new PermissionResolver(
    { findById: () => Promise.resolve(null) },
    { findByIds: () => Promise.resolve([]) },
  );
}

function makeRole(code: string, tenantId = 'tenant-a'): Role {
  return Object.assign(new Role(), {
    id: `role-${tenantId}-${code}`,
    tenantId,
    code,
    name: code,
    remark: '',
    permissions: [],
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });
}

test('默认租户的平台超管角色不能删除', async () => {
  const role = makeRole(SUPER_ADMIN_ROLE, DEFAULT_TENANT_ID);
  const repository = new MemoryRoleRepository([role]);
  const useCase = new RemoveRoleUseCase(repository, createResolver());

  await assert.rejects(useCase.execute(role.id), ConflictException);
  assert.equal((await repository.findById(role.id))?.deletedAt, null);
});

test('非默认租户的内置角色（含 admin 编码）可以软删除', async () => {
  for (const code of RESERVED_ROLE_CODES) {
    const role = makeRole(code, 'tenant-a');
    const repository = new MemoryRoleRepository([role]);
    const useCase = new RemoveRoleUseCase(repository, createResolver());

    await useCase.execute(role.id);

    assert.equal(await repository.findById(role.id), null, code);
    assert.ok(repository.has(role.id), '软删除不物理移除数据行');
    assert.ok((await repository.findDeletedById(role.id))?.deletedAt instanceof Date);
  }
});

test('删除不存在的角色返回 404', async () => {
  const repository = new MemoryRoleRepository([]);
  const useCase = new RemoveRoleUseCase(repository, createResolver());

  await assert.rejects(useCase.execute('missing'), NotFoundException);
});

test('软删除后可恢复，恢复后重新出现在默认查询中', async () => {
  const role = makeRole('custom_operator');
  const repository = new MemoryRoleRepository([role]);
  const resolver = createResolver();
  await new RemoveRoleUseCase(repository, resolver).execute(role.id);
  assert.equal(await repository.findById(role.id), null);

  const view = await new RestoreRoleUseCase(repository, resolver).execute(role.id);

  assert.equal(view.id, role.id);
  assert.equal(view.deletedAt, null);
  assert.equal((await repository.findById(role.id))?.deletedAt, null);
});

test('恢复未删除或不存在的角色返回 404', async () => {
  const role = makeRole('custom_operator');
  const repository = new MemoryRoleRepository([role]);
  const useCase = new RestoreRoleUseCase(repository, createResolver());

  await assert.rejects(useCase.execute(role.id), NotFoundException);
  await assert.rejects(useCase.execute('missing'), NotFoundException);
});

test('同编码角色已重建时不能恢复旧角色', async () => {
  const deleted = makeRole('custom_operator');
  deleted.id = 'role-old';
  deleted.deletedAt = new Date('2026-01-02T00:00:00Z');
  const recreated = makeRole('custom_operator');
  const repository = new MemoryRoleRepository([deleted, recreated]);
  const useCase = new RestoreRoleUseCase(repository, createResolver());

  await assert.rejects(useCase.execute(deleted.id), ConflictException);
  assert.ok((await repository.findDeletedById(deleted.id))?.deletedAt instanceof Date);
});
