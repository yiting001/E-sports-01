import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_TENANT_ID, PermissionType } from '@app/contracts';
import { PermissionResolver } from '../../src/modules/rbac/application/permission-resolver.service';
import { RoleGranter } from '../../src/modules/rbac/application/role-granter.service';
import { AssignRolePermissionsUseCase } from '../../src/modules/rbac/application/use-cases/assign-role-permissions.usecase';
import { AssignUserRolesUseCase } from '../../src/modules/rbac/application/use-cases/assign-user-roles.usecase';
import { RemoveRoleUseCase } from '../../src/modules/rbac/application/use-cases/remove-role.usecase';
import { Permission } from '../../src/modules/rbac/domain/permission.entity';
import type { PermissionRepository } from '../../src/modules/rbac/domain/permission-repository.interface';
import { MEMBER_ROLE, SUPER_ADMIN_ROLE } from '../../src/modules/rbac/domain/rbac.constants';
import { Role } from '../../src/modules/rbac/domain/role.entity';
import type { RoleRepository } from '../../src/modules/rbac/domain/role-repository.interface';
import { User } from '../../src/modules/rbac/domain/user.entity';
import type { UserRepository } from '../../src/modules/rbac/domain/user-repository.interface';
import { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

const TENANT = 'tenant-a';

function makePermission(id: string, code: string): Permission {
  return Object.assign(new Permission(), {
    id,
    code,
    name: code,
    type: PermissionType.Api,
    parentId: null,
    path: null,
    sort: 0,
  });
}

function makeRole(
  id: string,
  code: string,
  permissions: Permission[] = [],
  tenantId = TENANT,
  createdAt = '2026-01-01T00:00:00.000Z',
): Role {
  return Object.assign(new Role(), {
    id,
    tenantId,
    code,
    name: `${code}-${id}`,
    remark: '',
    permissions,
    deletedAt: null,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  });
}

function makeUser(id: string, roles: Role[], tenantId = TENANT): User {
  return Object.assign(new User(), {
    id,
    tenantId,
    username: id,
    nickname: id,
    status: 'enabled',
    roles,
    avatar: '',
    phone: '',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

/** 内存角色仓储：同编码多实例、按创建时间排序的编码查找、软删除 */
class MemoryRoleRepository
  implements
    Pick<
      RoleRepository,
      'findById' | 'findByIds' | 'findByCodeForTenant' | 'save' | 'remove'
    >
{
  constructor(readonly roles: Role[]) {}

  private alive(): Role[] {
    return this.roles.filter((role) => role.deletedAt === null);
  }

  async findById(id: string): Promise<Role | null> {
    return this.alive().find((role) => role.id === id) ?? null;
  }

  async findByIds(ids: string[]): Promise<Role[]> {
    return this.alive().filter((role) => ids.includes(role.id));
  }

  async findByCodeForTenant(code: string, tenantId: string): Promise<Role | null> {
    return (
      this.alive()
        .filter((role) => role.code === code && role.tenantId === tenantId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null
    );
  }

  async save(role: Role): Promise<Role> {
    const index = this.roles.findIndex((item) => item.id === role.id);
    if (index === -1) {
      this.roles.push(role);
    } else {
      this.roles[index] = role;
    }
    return role;
  }

  async remove(id: string): Promise<void> {
    const role = this.roles.find((item) => item.id === id);
    if (role) {
      role.deletedAt = new Date();
    }
  }
}

class MemoryUserRepository implements Pick<UserRepository, 'findById' | 'save'> {
  constructor(readonly users: User[]) {}

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async save(user: User): Promise<User> {
    return user;
  }
}

test('同编码角色可分别绑定不同用户，权限按各自角色实例独立解析', async () => {
  const viewOrders = makePermission('perm-view', 'order:view');
  const refundOrders = makePermission('perm-refund', 'order:refund');
  const serviceA = makeRole('role-service-a', 'service', [viewOrders]);
  const serviceB = makeRole('role-service-b', 'service', [viewOrders, refundOrders]);
  const userA = makeUser('user-a', []);
  const userB = makeUser('user-b', []);
  const roleRepo = new MemoryRoleRepository([serviceA, serviceB]);
  const userRepo = new MemoryUserRepository([userA, userB]);
  const resolver = new PermissionResolver(userRepo, roleRepo);
  const assign = new AssignUserRolesUseCase(userRepo, roleRepo, resolver);

  await assign.execute(userA.id, [serviceA.id]);
  await assign.execute(userB.id, [serviceB.id]);

  const contextA = await resolver.resolve(userA.id);
  const contextB = await resolver.resolve(userB.id);
  assert.deepEqual(contextA.roles, ['service']);
  assert.deepEqual(contextA.permissions, ['order:view']);
  assert.deepEqual(contextB.roles, ['service']);
  assert.deepEqual(contextB.permissions.sort(), ['order:refund', 'order:view']);
  assert.deepEqual(userA.roles.map((role) => role.id), [serviceA.id]);
  assert.deepEqual(userB.roles.map((role) => role.id), [serviceB.id]);
});

test('修改其中一个同编码角色的授权不影响另一个实例', async () => {
  const viewOrders = makePermission('perm-view', 'order:view');
  const refundOrders = makePermission('perm-refund', 'order:refund');
  const serviceA = makeRole('role-service-a', 'service', [viewOrders]);
  const serviceB = makeRole('role-service-b', 'service', [viewOrders]);
  const roleRepo = new MemoryRoleRepository([serviceA, serviceB]);
  const permRepo: Pick<PermissionRepository, 'findByIds'> = {
    findByIds: async (ids) =>
      [viewOrders, refundOrders].filter((permission) => ids.includes(permission.id)),
  };
  const userA = makeUser('user-a', [serviceA]);
  const userB = makeUser('user-b', [serviceB]);
  const userRepo = new MemoryUserRepository([userA, userB]);
  const resolver = new PermissionResolver(userRepo, roleRepo);
  const tenant = new TenantContextService();
  const useCase = new AssignRolePermissionsUseCase(roleRepo, permRepo, resolver, tenant);

  await tenant.run({ tenantId: TENANT, isSuper: false }, async () => {
    const view = await useCase.execute(serviceB.id, [refundOrders.id]);
    assert.deepEqual(view.permissionIds, [refundOrders.id]);
  });

  assert.deepEqual((await resolver.resolve(userA.id)).permissions, ['order:view']);
  assert.deepEqual((await resolver.resolve(userB.id)).permissions, ['order:refund']);
});

test('软删除一个同编码角色后，另一个同编码角色的用户权限继续生效', async () => {
  const viewOrders = makePermission('perm-view', 'order:view');
  const serviceA = makeRole('role-service-a', 'service', [viewOrders]);
  const serviceB = makeRole('role-service-b', 'service', [viewOrders]);
  const roleRepo = new MemoryRoleRepository([serviceA, serviceB]);
  const userA = makeUser('user-a', [serviceA]);
  const userB = makeUser('user-b', [serviceB]);
  const userRepo = new MemoryUserRepository([userA, userB]);
  const resolver = new PermissionResolver(userRepo, roleRepo);
  const removeRole = new RemoveRoleUseCase(roleRepo, resolver);

  await removeRole.execute(serviceA.id);

  assert.deepEqual((await resolver.resolve(userA.id)).permissions, []);
  assert.deepEqual((await resolver.resolve(userB.id)).permissions, ['order:view']);
  assert.equal((await roleRepo.findById(serviceB.id))?.id, serviceB.id);
});

test('按编码自动授予时稳定绑定最早创建的同编码角色，撤销只移除该编码的所有实例', async () => {
  const seeded = makeRole('role-member-seeded', MEMBER_ROLE, [], TENANT, '2026-01-01T00:00:00Z');
  const custom = makeRole('role-member-custom', MEMBER_ROLE, [], TENANT, '2026-02-01T00:00:00Z');
  const roleRepo = new MemoryRoleRepository([custom, seeded]);
  const user = makeUser('user-a', []);
  const userRepo = new MemoryUserRepository([user]);
  const resolver = new PermissionResolver(userRepo, roleRepo);
  const granter = new RoleGranter(roleRepo, userRepo, resolver);

  await granter.grant(user.id, MEMBER_ROLE);
  assert.deepEqual(user.roles.map((role) => role.id), [seeded.id]);

  await granter.grant(user.id, MEMBER_ROLE);
  assert.deepEqual(user.roles.map((role) => role.id), [seeded.id], '重复授予不会再挂第二个实例');

  await granter.revoke(user.id, MEMBER_ROLE);
  assert.deepEqual(user.roles, []);
});

test('默认租户内新建的第二个 admin 编码角色仍具备超管旁路，非默认租户 admin 不具备', async () => {
  const platformAdminTwin = makeRole('role-admin-2', SUPER_ADMIN_ROLE, [], DEFAULT_TENANT_ID);
  const tenantAdmin = makeRole('role-admin-tenant', SUPER_ADMIN_ROLE, [], TENANT);
  const platformUser = makeUser('user-platform', [platformAdminTwin], DEFAULT_TENANT_ID);
  const tenantUser = makeUser('user-tenant', [tenantAdmin], TENANT);
  const roleRepo = new MemoryRoleRepository([platformAdminTwin, tenantAdmin]);
  const userRepo = new MemoryUserRepository([platformUser, tenantUser]);
  const resolver = new PermissionResolver(userRepo, roleRepo);

  assert.equal((await resolver.resolve(platformUser.id)).isSuper, true);
  assert.equal((await resolver.resolve(tenantUser.id)).isSuper, false);
});
