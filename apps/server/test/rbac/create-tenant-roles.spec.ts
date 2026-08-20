import assert from 'node:assert/strict';
import test from 'node:test';
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
  const permissionRepo: Pick<PermissionRepository, 'findAll'> = {
    findAll: async () => permissions,
  };
  const provisioning: TenantProvisioningTransaction = {
    run: (work) =>
      work({
        tenants: tenantRepo,
        roles: roleRepo,
        permissions: permissionRepo,
      }),
  };
  const useCase = new CreateTenantUseCase(provisioning);

  await useCase.execute({
    code: 'tenant-a',
    name: '租户 A',
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

test('创建租户 DTO 只需要编码与名称，不再接受管理员账号字段', async () => {
  const dto = Object.assign(new CreateTenantDto(), {
    code: 'tenant-a',
    name: '租户 A',
  });

  assert.equal((await validate(dto)).length, 0);
  assert.equal('adminPassword' in dto, false);
  assert.equal('adminUsername' in dto, false);
});
