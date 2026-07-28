import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { BOOSTER_ROLE_CODE, PermissionType, PERMS } from '@app/contracts';
import { validate } from 'class-validator';
import { CreateTenantUseCase } from '../../src/modules/rbac/application/use-cases/create-tenant.usecase';
import { Permission } from '../../src/modules/rbac/domain/permission.entity';
import type { PermissionRepository } from '../../src/modules/rbac/domain/permission-repository.interface';
import {
  MEMBER_ROLE,
  PLATFORM_ONLY_PERMISSION_CODES,
  SERVICE_ROLE,
  SERVICE_ROLE_PERMISSION_CODES,
  TENANT_ADMIN_ROLE,
} from '../../src/modules/rbac/domain/rbac.constants';
import { Role } from '../../src/modules/rbac/domain/role.entity';
import type { RoleRepository } from '../../src/modules/rbac/domain/role-repository.interface';
import type { TenantProvisioningTransaction } from '../../src/modules/rbac/domain/tenant-provisioning-transaction.interface';
import { TenantEntity } from '../../src/modules/rbac/domain/tenant.entity';
import type { TenantRepository } from '../../src/modules/rbac/domain/tenant-repository.interface';
import { User } from '../../src/modules/rbac/domain/user.entity';
import type { UserRepository } from '../../src/modules/rbac/domain/user-repository.interface';
import type { PasswordService } from '../../src/modules/rbac/infrastructure/password.service';
import { CreateTenantDto } from '../../src/modules/rbac/interfaces/dto/create-tenant.dto';

function makePermission(code: string): Permission {
  return Object.assign(new Permission(), {
    id: `permission-${code}`,
    code,
    name: code,
    type: PermissionType.Api,
  });
}

test('创建租户时一次性播种管理员、会员、客服和打手四类基础角色', async () => {
  const permissions = [
    makePermission(PERMS.tenant.list),
    makePermission(PERMS.permission.list),
    ...PLATFORM_ONLY_PERMISSION_CODES.map(makePermission),
    ...SERVICE_ROLE_PERMISSION_CODES.map(makePermission),
  ];
  const savedRoles: Role[] = [];
  const tenantRepo: Pick<TenantRepository, 'existsByCode' | 'create' | 'save'> = {
    existsByCode: async () => false,
    create: (data: Partial<TenantEntity>) => Object.assign(new TenantEntity(), data),
    save: async (tenant: TenantEntity) =>
      Object.assign(tenant, {
        id: 'tenant-a',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
  };
  const roleRepo: Pick<RoleRepository, 'create' | 'save'> = {
    create: (data: Partial<Role>) => Object.assign(new Role(), { permissions: [], ...data }),
    save: async (role: Role) => {
      if (!role.id) {
        role.id = `role-${role.code}`;
        savedRoles.push(role);
      }
      return role;
    },
  };
  const userRepo: Pick<UserRepository, 'create' | 'save'> = {
    create: (data: Partial<User>) => Object.assign(new User(), data),
    save: async (user: User) => Object.assign(user, { id: 'tenant-admin-user' }),
  };
  const permissionRepo: Pick<PermissionRepository, 'findAll'> = {
    findAll: async () => permissions,
  };
  const provisioning: TenantProvisioningTransaction = {
    run: (work) =>
      work({
        tenants: tenantRepo,
        roles: roleRepo,
        users: userRepo,
        permissions: permissionRepo,
      }),
  };
  const password: Pick<PasswordService, 'hash'> = { hash: async () => 'password-hash' };
  const useCase = new CreateTenantUseCase(provisioning, password);

  await useCase.execute({
    code: 'tenant-a',
    name: '租户 A',
    adminPassword: 'Tenant-A#2026',
  });

  assert.deepEqual(
    savedRoles.map((role) => role.code),
    [TENANT_ADMIN_ROLE, MEMBER_ROLE, SERVICE_ROLE, BOOSTER_ROLE_CODE],
  );
  const tenantAdmin = savedRoles.find((role) => role.code === TENANT_ADMIN_ROLE);
  assert.equal(
    tenantAdmin?.permissions.some((permission) => permission.code.startsWith('rbac:tenant:')),
    false,
  );
  assert.equal(
    tenantAdmin?.permissions.some((permission) => permission.code.startsWith('rbac:permission:')),
    false,
  );
  const platformOnlyPermissionCodes = new Set<string>(PLATFORM_ONLY_PERMISSION_CODES);
  assert.equal(
    tenantAdmin?.permissions.some((permission) => platformOnlyPermissionCodes.has(permission.code)),
    false,
  );
  const service = savedRoles.find((role) => role.code === SERVICE_ROLE);
  assert.deepEqual(
    new Set(service?.permissions.map((permission) => permission.code)),
    new Set(SERVICE_ROLE_PERMISSION_CODES),
  );
});

test('创建租户必须在写入前拒绝弱管理员密码', async () => {
  let tenantSaved = false;
  const tenantRepo: Pick<TenantRepository, 'existsByCode' | 'create' | 'save'> = {
    existsByCode: async () => false,
    create: (data: Partial<TenantEntity>) => Object.assign(new TenantEntity(), data),
    save: async (tenant: TenantEntity) => {
      tenantSaved = true;
      return tenant;
    },
  };
  const roleRepo: Pick<RoleRepository, 'create' | 'save'> = {
    create: (data) => Object.assign(new Role(), data),
    save: async (role) => role,
  };
  const userRepo: Pick<UserRepository, 'create' | 'save'> = {
    create: (data) => Object.assign(new User(), data),
    save: async (user) => user,
  };
  const permissionRepo: Pick<PermissionRepository, 'findAll'> = {
    findAll: async () => [],
  };
  const provisioning: TenantProvisioningTransaction = {
    run: (work) =>
      work({
        tenants: tenantRepo,
        roles: roleRepo,
        users: userRepo,
        permissions: permissionRepo,
      }),
  };
  const password: Pick<PasswordService, 'hash'> = {
    hash: async () => 'password-hash',
  };
  const useCase = new CreateTenantUseCase(provisioning, password);

  for (const adminPassword of ['admin123456', ' Tenant-A#2026 ']) {
    await assert.rejects(
      useCase.execute({
        code: 'tenant-a',
        name: '租户 A',
        adminPassword,
      }),
      (error: unknown) => error instanceof BadRequestException,
    );
  }
  assert.equal(tenantSaved, false);
});

test('创建租户 DTO 只接受独立强管理员密码', async () => {
  const weak = Object.assign(new CreateTenantDto(), {
    code: 'tenant-a',
    name: '租户 A',
    adminPassword: 'admin123456',
  });
  const strong = Object.assign(new CreateTenantDto(), {
    code: 'tenant-a',
    name: '租户 A',
    adminPassword: 'Tenant-A#2026',
  });

  assert.ok((await validate(weak)).some((error) => error.property === 'adminPassword'));
  assert.equal((await validate(strong)).length, 0);
});
