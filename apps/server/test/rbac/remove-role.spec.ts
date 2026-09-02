import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException } from '@nestjs/common';
import { RemoveRoleUseCase } from '../../src/modules/rbac/application/use-cases/remove-role.usecase';
import { PermissionResolver } from '../../src/modules/rbac/application/permission-resolver.service';
import { RESERVED_ROLE_CODES } from '../../src/modules/rbac/domain/rbac.constants';
import { Role } from '../../src/modules/rbac/domain/role.entity';
import type { RoleRepository } from '../../src/modules/rbac/domain/role-repository.interface';
import type { RoleListQuery } from '@app/contracts';

class MemoryRoleRepository implements RoleRepository {
  private readonly roles = new Map<string, Role>();

  constructor(initial: Role[]) {
    for (const role of initial) {
      this.roles.set(role.id, role);
    }
  }

  findById(id: string): Promise<Role | null> {
    return Promise.resolve(this.roles.get(id) ?? null);
  }

  findByIds(ids: string[]): Promise<Role[]> {
    return Promise.resolve(
      ids.flatMap((id) => {
        const role = this.roles.get(id);
        return role ? [role] : [];
      }),
    );
  }

  findByCode(code: string): Promise<Role | null> {
    return Promise.resolve([...this.roles.values()].find((role) => role.code === code) ?? null);
  }

  findByCodeForTenant(code: string, tenantId: string): Promise<Role | null> {
    return Promise.resolve(
      [...this.roles.values()].find((role) => role.code === code && role.tenantId === tenantId) ??
        null,
    );
  }

  findAllOutsideTenant(tenantId: string): Promise<Role[]> {
    return Promise.resolve([...this.roles.values()].filter((role) => role.tenantId !== tenantId));
  }

  existsByCode(code: string): Promise<boolean> {
    return Promise.resolve([...this.roles.values()].some((role) => role.code === code));
  }

  paginate(skip: number, take: number, filter: RoleListQuery = {}): Promise<[Role[], number]> {
    const keyword = filter.keyword;
    const found = [...this.roles.values()].filter(
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
    this.roles.delete(id);
    return Promise.resolve();
  }
}

function createResolver(): PermissionResolver {
  return new PermissionResolver(
    { findById: () => Promise.resolve(null) },
    { findByIds: () => Promise.resolve([]) },
  );
}

function makeRole(code: string): Role {
  return Object.assign(new Role(), {
    id: `role-${code}`,
    tenantId: 'tenant-a',
    code,
    name: code,
    remark: '',
    permissions: [],
  });
}

test('内置角色不能通过通用角色接口删除', async () => {
  for (const code of RESERVED_ROLE_CODES) {
    const role = makeRole(code);
    const repository = new MemoryRoleRepository([role]);
    const useCase = new RemoveRoleUseCase(repository, createResolver());

    await assert.rejects(useCase.execute(role.id), ConflictException);
    assert.equal((await repository.findById(role.id))?.code, code);
  }
});

test('自定义角色仍可以删除', async () => {
  const role = makeRole('custom_operator');
  const repository = new MemoryRoleRepository([role]);
  const useCase = new RemoveRoleUseCase(repository, createResolver());

  await useCase.execute(role.id);

  assert.equal(await repository.findById(role.id), null);
});
