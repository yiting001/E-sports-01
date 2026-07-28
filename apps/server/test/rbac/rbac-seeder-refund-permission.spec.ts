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
    users: [],
  });
}

test('RbacSeeder 补齐所有存量租户管理员退款权限后立即失效缓存且保持幂等', async () => {
  const refundPermission = makePermission(PERMS.order.refundReview);
  const tenantAdminMissing = makeRole(TENANT_ADMIN_ROLE, 'tenant-a', []);
  const tenantAdminGranted = makeRole(TENANT_ADMIN_ROLE, 'tenant-b', [refundPermission]);
  const servicePermissions = SERVICE_ROLE_PERMISSION_CODES.map(makePermission);
  const roles = [
    makeRole(SUPER_ADMIN_ROLE, DEFAULT_TENANT_ID, []),
    makeRole(MEMBER_ROLE, DEFAULT_TENANT_ID, []),
    makeRole(SERVICE_ROLE, DEFAULT_TENANT_ID, servicePermissions),
    makeRole(BOOSTER_ROLE_CODE, DEFAULT_TENANT_ID, []),
    tenantAdminMissing,
    tenantAdminGranted,
  ];
  const savedRoleIds: string[] = [];
  const roleRepo: RoleRepository = {
    findById: async (id) => roles.find((role) => role.id === id) ?? null,
    findByIds: async (ids) => roles.filter((role) => ids.includes(role.id)),
    findByCode: async (code) => roles.find((role) => role.code === code) ?? null,
    findByCodeForTenant: async (code, tenantId) =>
      roles.find((role) => role.code === code && role.tenantId === tenantId) ?? null,
    findAllByCode: async (code) => roles.filter((role) => role.code === code),
    existsByCode: async (code) => roles.some((role) => role.code === code),
    paginate: async () => [roles, roles.length],
    create: (data) => Object.assign(new Role(), data),
    save: async (role) => {
      savedRoleIds.push(role.id);
      return role;
    },
    remove: async () => undefined,
  };
  const permissionRepo: PermissionRepository = {
    findAll: async () => [],
    findById: async (id) => (id === refundPermission.id ? refundPermission : null),
    findByIds: async (ids) => (ids.includes(refundPermission.id) ? [refundPermission] : []),
    findByCode: async (code) => (code === refundPermission.code ? refundPermission : null),
    existsByCode: async (code) => code === refundPermission.code,
    create: (data) => Object.assign(new Permission(), data),
    save: async (permission) => permission,
    createMissing: async () => 0,
    remove: async () => undefined,
  };
  const tenant = Object.assign(new TenantEntity(), { id: DEFAULT_TENANT_ID });
  const tenantRepo: TenantRepository = {
    findById: async (id) => (id === DEFAULT_TENANT_ID ? tenant : null),
    findByCode: async () => tenant,
    findByIds: async () => [tenant],
    findAll: async () => [tenant],
    existsByCode: async () => true,
    paginate: async () => [[tenant], 1],
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

  await seeder.onApplicationBootstrap();

  assert.deepEqual(savedRoleIds, [tenantAdminMissing.id]);
  assert.equal(
    tenantAdminMissing.permissions.some(
      (permission) => permission.code === PERMS.order.refundReview,
    ),
    true,
  );
  assert.equal(invalidateAllCalls, 1);

  await seeder.onApplicationBootstrap();

  assert.deepEqual(savedRoleIds, [tenantAdminMissing.id]);
  assert.equal(invalidateAllCalls, 1);
});
