import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_TENANT_ID, PermissionType, PERMS } from '@app/contracts';
import { ForbiddenException } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { PermissionResolver } from '../../src/modules/rbac/application/permission-resolver.service';
import { AssignRolePermissionsUseCase } from '../../src/modules/rbac/application/use-cases/assign-role-permissions.usecase';
import { ListGrantablePermissionsUseCase } from '../../src/modules/rbac/application/use-cases/list-grantable-permissions.usecase';
import { Permission } from '../../src/modules/rbac/domain/permission.entity';
import type { PermissionRepository } from '../../src/modules/rbac/domain/permission-repository.interface';
import { Role } from '../../src/modules/rbac/domain/role.entity';
import type { RoleRepository } from '../../src/modules/rbac/domain/role-repository.interface';
import { AUTH_METADATA } from '../../src/modules/rbac/interfaces/auth/metadata';
import { RoleGrantablePermissionsController } from '../../src/modules/rbac/interfaces/controllers/role.grantable-permissions.controller';
import { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

function permission(code: string): Permission {
  return Object.assign(new Permission(), {
    id: `permission-${code}`,
    parentId: null,
    code,
    name: code,
    type: PermissionType.Api,
    path: null,
    component: null,
    apiMethod: null,
    apiPath: null,
    icon: null,
    sort: 0,
  });
}

test('可授予权限目录对租户过滤平台权限，对平台超管返回全部', async () => {
  const permissions = [
    permission(PERMS.tenant.list),
    permission(PERMS.permission.list),
    permission(PERMS.realname.policy),
    permission(PERMS.invite.configSet),
    permission(PERMS.realname.policyView),
    permission(PERMS.role.list),
  ];
  const repository: Pick<PermissionRepository, 'findAll'> = {
    findAll: async () => permissions,
  };
  const tenant = new TenantContextService();
  const useCase = new ListGrantablePermissionsUseCase(repository, tenant);

  const tenantNodes = await tenant.run(
    { tenantId: 'tenant-a', isSuper: false },
    () => useCase.execute(),
  );
  assert.deepEqual(
    tenantNodes.map((node) => node.code),
    [PERMS.realname.policyView, PERMS.role.list],
  );

  const platformNodes = await tenant.run(
    { tenantId: DEFAULT_TENANT_ID, isSuper: true },
    () => useCase.execute(),
  );
  assert.deepEqual(
    platformNodes.map((node) => node.code),
    permissions.map((item) => item.code),
  );
});

test('可授予权限使用独立角色路由且不放开平台权限目录', () => {
  assert.equal(Reflect.getMetadata(PATH_METADATA, RoleGrantablePermissionsController), 'rbac/roles');
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, RoleGrantablePermissionsController.prototype.list),
    'grantable-permissions',
  );
  assert.deepEqual(
    Reflect.getMetadata(
      AUTH_METADATA.permissions,
      RoleGrantablePermissionsController.prototype.list,
    ),
    [PERMS.role.assignPermissions],
  );
  assert.equal(
    Reflect.getMetadata(AUTH_METADATA.platformOnly, RoleGrantablePermissionsController),
    undefined,
  );
});

test('租户管理员不能通过权限 ID 给角色写入平台权限', async () => {
  const role = Object.assign(new Role(), {
    id: 'role-a',
    tenantId: 'tenant-a',
    code: 'operator',
    name: '运营',
    remark: '',
    permissions: [],
  });
  const platformPermission = permission(PERMS.tenant.list);
  let saved = false;
  const roleRepository: Pick<RoleRepository, 'findById' | 'save'> = {
    findById: async () => role,
    save: async (entity) => {
      saved = true;
      return entity;
    },
  };
  const permissionRepository: Pick<PermissionRepository, 'findByIds'> = {
    findByIds: async () => [platformPermission],
  };
  const permissionResolver: Pick<PermissionResolver, 'invalidateAll'> = {
    invalidateAll: async () => undefined,
  };
  const tenant = new TenantContextService();
  const useCase = new AssignRolePermissionsUseCase(
    roleRepository,
    permissionRepository,
    permissionResolver,
    tenant,
  );

  await tenant.run({ tenantId: 'tenant-a', isSuper: false }, async () => {
    await assert.rejects(
      useCase.execute(role.id, [platformPermission.id]),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });
  assert.equal(saved, false);
});
