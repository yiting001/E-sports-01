import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOSTER_ROLE_CODE, DEFAULT_TENANT_ID, PermissionType, PERMS } from '@app/contracts';
import type { PermissionResolver } from '../../src/modules/rbac/application/permission-resolver.service';
import { Permission } from '../../src/modules/rbac/domain/permission.entity';
import type { PermissionRepository } from '../../src/modules/rbac/domain/permission-repository.interface';
import {
  MEMBER_ROLE,
  SERVICE_ROLE,
  SERVICE_ROLE_PERMISSION_CODES,
  SUPER_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
} from '../../src/modules/rbac/domain/rbac.constants';
import { Role } from '../../src/modules/rbac/domain/role.entity';
import type { RoleRepository } from '../../src/modules/rbac/domain/role-repository.interface';
import { TenantEntity } from '../../src/modules/rbac/domain/tenant.entity';
import type { TenantRepository } from '../../src/modules/rbac/domain/tenant-repository.interface';
import { User } from '../../src/modules/rbac/domain/user.entity';
import type { UserRepository } from '../../src/modules/rbac/domain/user-repository.interface';
import { PasswordService } from '../../src/modules/rbac/infrastructure/password.service';
import { RbacSeeder } from '../../src/modules/rbac/infrastructure/rbac.seeder';

function makePermission(code: string): Permission {
  return Object.assign(new Permission(), {
    id: `permission-${code}`,
    code,
    name: code,
    type: PermissionType.Api,
    parentId: null,
    path: null,
    component: null,
    apiMethod: null,
    apiPath: null,
    icon: null,
    sort: 0,
    roles: [],
  });
}

function makeRole(code: string, tenantId: string, permissions: Permission[]): Role {
  return Object.assign(new Role(), {
    id: `${tenantId}-${code}`,
    tenantId,
    code,
    name: code,
    remark: '',
    permissions,
    deletedAt: null,
    users: [],
  });
}

function makeTenant(id: string): TenantEntity {
  return Object.assign(new TenantEntity(), { id });
}

interface Harness {
  seeder: RbacSeeder;
  roles: Role[];
  savedRoleIds: string[];
  invalidateAllCalls: () => number;
}

function buildHarness(roles: Role[], permissions: Permission[], tenants: TenantEntity[]): Harness {
  const savedRoleIds: string[] = [];
  const alive = (): Role[] => roles.filter((role) => role.deletedAt === null);
  const roleRepo: RoleRepository = {
    findById: async (id) => alive().find((role) => role.id === id) ?? null,
    findByIds: async (ids) => alive().filter((role) => ids.includes(role.id)),
    findByCode: async (code) => alive().find((role) => role.code === code) ?? null,
    findByCodeForTenant: async (code, tenantId) =>
      alive().find((role) => role.code === code && role.tenantId === tenantId) ?? null,
    existsByCodeForTenantWithDeleted: async (code, tenantId) =>
      roles.some((role) => role.code === code && role.tenantId === tenantId),
    findDeletedById: async (id) =>
      roles.find((role) => role.id === id && role.deletedAt !== null) ?? null,
    findAllOutsideTenant: async (tenantId) => alive().filter((role) => role.tenantId !== tenantId),
    existsByCode: async (code) => alive().some((role) => role.code === code),
    paginate: async () => [alive(), alive().length],
    create: (data) => Object.assign(new Role(), data),
    save: async (role) => {
      if (!role.id) {
        role.id = `${role.tenantId}-${role.code}`;
        roles.push(role);
      }
      savedRoleIds.push(role.id);
      return role;
    },
    remove: async () => undefined,
    restore: async () => undefined,
  };
  const permissionRepo: PermissionRepository = {
    findAll: async () => permissions,
    findById: async (id) => permissions.find((permission) => permission.id === id) ?? null,
    findByIds: async (ids) => permissions.filter((permission) => ids.includes(permission.id)),
    findByCode: async (code) => permissions.find((permission) => permission.code === code) ?? null,
    existsByCode: async (code) => permissions.some((permission) => permission.code === code),
    create: (data) => Object.assign(new Permission(), data),
    save: async (permission) => permission,
    createMissing: async () => 0,
    remove: async () => undefined,
  };
  const tenantRepo: TenantRepository = {
    findById: async (id) => tenants.find((tenant) => tenant.id === id) ?? null,
    findByCode: async () => tenants[0],
    findByIds: async () => tenants,
    findAll: async () => tenants,
    existsByCode: async () => true,
    paginate: async () => [tenants, tenants.length],
    create: (data) => Object.assign(new TenantEntity(), data),
    save: async (entity) => entity,
    remove: async () => undefined,
  };
  const userRepo: UserRepository = {
    findById: async () => null,
    findByIds: async () => [],
    findByUsernameWithPassword: async () => null,
    findByAccountWithPassword: async () => null,
    findByPhone: async () => null,
    existsByUsername: async () => true,
    existsByPhone: async () => false,
    paginate: async () => [[], 0],
    paginateByRole: async () => [[], 0],
    create: (data) => Object.assign(new User(), data),
    save: async (user) => user,
    remove: async () => undefined,
  };
  let invalidateAllCalls = 0;
  const permissionCache: Pick<PermissionResolver, 'invalidateAll'> = {
    invalidateAll: async () => {
      invalidateAllCalls += 1;
    },
  };
  const seeder = new RbacSeeder(
    permissionRepo,
    roleRepo,
    userRepo,
    tenantRepo,
    new PasswordService(),
    permissionCache,
  );
  return { seeder, roles, savedRoleIds, invalidateAllCalls: () => invalidateAllCalls };
}

function baseRoles(): Role[] {
  return [
    makeRole(SUPER_ADMIN_ROLE, DEFAULT_TENANT_ID, []),
    makeRole(MEMBER_ROLE, DEFAULT_TENANT_ID, []),
    makeRole(SERVICE_ROLE, DEFAULT_TENANT_ID, []),
    makeRole(BOOSTER_ROLE_CODE, DEFAULT_TENANT_ID, []),
  ];
}

test('RbacSeeder 启动时不改写存量角色的权限，管理员手动收窄后不会被回填', async () => {
  const refundPermission = makePermission(PERMS.order.refundReview);
  const orderListPermission = makePermission(PERMS.order.list);
  const servicePermissions = SERVICE_ROLE_PERMISSION_CODES.map(makePermission);
  const narrowedTenantAdmin = makeRole(TENANT_ADMIN_ROLE, 'tenant-a', [orderListPermission]);
  const emptyService = makeRole(SERVICE_ROLE, 'tenant-a', []);
  const roles = [
    ...baseRoles(),
    narrowedTenantAdmin,
    makeRole(MEMBER_ROLE, 'tenant-a', []),
    emptyService,
    makeRole(BOOSTER_ROLE_CODE, 'tenant-a', []),
  ];
  const harness = buildHarness(
    roles,
    [refundPermission, orderListPermission, ...servicePermissions],
    [makeTenant(DEFAULT_TENANT_ID), makeTenant('tenant-a')],
  );

  await harness.seeder.onApplicationBootstrap();
  await harness.seeder.onApplicationBootstrap();

  assert.deepEqual(harness.savedRoleIds, []);
  assert.deepEqual(
    narrowedTenantAdmin.permissions.map((permission) => permission.code),
    [PERMS.order.list],
  );
  assert.deepEqual(emptyService.permissions, []);
  assert.equal(harness.invalidateAllCalls(), 0);
});

test('RbacSeeder 只为缺失内置角色的存量租户新建角色，且租户管理员不带任何权限', async () => {
  const servicePermissions = SERVICE_ROLE_PERMISSION_CODES.map(makePermission);
  const harness = buildHarness(
    baseRoles(),
    [makePermission(PERMS.order.refundReview), ...servicePermissions],
    [makeTenant(DEFAULT_TENANT_ID), makeTenant('tenant-b')],
  );

  await harness.seeder.onApplicationBootstrap();

  const tenantRoles = harness.roles.filter((role) => role.tenantId === 'tenant-b');
  assert.deepEqual(
    tenantRoles.map((role) => role.code),
    [TENANT_ADMIN_ROLE, MEMBER_ROLE, SERVICE_ROLE, BOOSTER_ROLE_CODE],
  );
  const tenantAdmin = tenantRoles.find((role) => role.code === TENANT_ADMIN_ROLE);
  assert.deepEqual(tenantAdmin?.permissions, []);
  const service = tenantRoles.find((role) => role.code === SERVICE_ROLE);
  assert.deepEqual(
    new Set(service?.permissions.map((permission) => permission.code)),
    new Set(SERVICE_ROLE_PERMISSION_CODES),
  );
  assert.equal(harness.invalidateAllCalls(), 1);

  const savedBefore = harness.savedRoleIds.length;
  await harness.seeder.onApplicationBootstrap();
  assert.equal(harness.savedRoleIds.length, savedBefore);
  assert.equal(harness.invalidateAllCalls(), 1);
});

test('RbacSeeder 不会复活管理员已软删除的内置角色', async () => {
  const deletedService = makeRole(SERVICE_ROLE, 'tenant-c', []);
  deletedService.deletedAt = new Date('2026-01-01T00:00:00Z');
  const harness = buildHarness(
    [
      ...baseRoles(),
      makeRole(TENANT_ADMIN_ROLE, 'tenant-c', []),
      makeRole(MEMBER_ROLE, 'tenant-c', []),
      deletedService,
      makeRole(BOOSTER_ROLE_CODE, 'tenant-c', []),
    ],
    SERVICE_ROLE_PERMISSION_CODES.map(makePermission),
    [makeTenant(DEFAULT_TENANT_ID), makeTenant('tenant-c')],
  );

  await harness.seeder.onApplicationBootstrap();

  assert.deepEqual(harness.savedRoleIds, []);
  assert.equal(
    harness.roles.filter((role) => role.tenantId === 'tenant-c' && role.code === SERVICE_ROLE)
      .length,
    1,
  );
  assert.equal(harness.invalidateAllCalls(), 0);
});

test('RbacSeeder 启动时从租户角色移除平台级权限，并保留其余业务权限', async () => {
  const roleCreate = makePermission(PERMS.role.create);
  const assignPermissions = makePermission(PERMS.role.assignPermissions);
  const tenantList = makePermission(PERMS.tenant.list);
  const orderList = makePermission(PERMS.order.list);
  const roleList = makePermission(PERMS.role.list);
  const tenantAdmin = makeRole(TENANT_ADMIN_ROLE, 'tenant-a', [
    roleCreate,
    assignPermissions,
    tenantList,
    orderList,
    roleList,
  ]);
  const customRole = makeRole('operator', 'tenant-a', [roleCreate, orderList]);
  const platformRole = makeRole('ops', DEFAULT_TENANT_ID, [roleCreate, tenantList]);
  const roles = [
    ...baseRoles(),
    platformRole,
    tenantAdmin,
    makeRole(MEMBER_ROLE, 'tenant-a', []),
    makeRole(SERVICE_ROLE, 'tenant-a', []),
    makeRole(BOOSTER_ROLE_CODE, 'tenant-a', []),
    customRole,
  ];
  const harness = buildHarness(
    roles,
    [roleCreate, assignPermissions, tenantList, orderList, roleList],
    [makeTenant(DEFAULT_TENANT_ID), makeTenant('tenant-a')],
  );

  await harness.seeder.onApplicationBootstrap();

  assert.deepEqual(harness.savedRoleIds, [tenantAdmin.id, customRole.id]);
  assert.deepEqual(
    tenantAdmin.permissions.map((permission) => permission.code),
    [PERMS.order.list, PERMS.role.list],
  );
  assert.deepEqual(
    customRole.permissions.map((permission) => permission.code),
    [PERMS.order.list],
  );
  assert.deepEqual(
    platformRole.permissions.map((permission) => permission.code),
    [PERMS.role.create, PERMS.tenant.list],
  );
  assert.equal(harness.invalidateAllCalls(), 1);

  await harness.seeder.onApplicationBootstrap();
  assert.deepEqual(harness.savedRoleIds, [tenantAdmin.id, customRole.id]);
  assert.equal(harness.invalidateAllCalls(), 1);
});
