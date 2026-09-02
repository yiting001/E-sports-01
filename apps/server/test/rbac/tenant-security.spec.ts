import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { DEFAULT_TENANT_CODE, DEFAULT_TENANT_ID, TenantStatus } from '@app/contracts';
import { PermissionResolver } from '../../src/modules/rbac/application/permission-resolver.service';
import { TenantResolver } from '../../src/modules/rbac/application/tenant-resolver.service';
import { AssignUserRolesUseCase } from '../../src/modules/rbac/application/use-cases/assign-user-roles.usecase';
import { CreateRoleUseCase } from '../../src/modules/rbac/application/use-cases/create-role.usecase';
import { RefreshTokenUseCase } from '../../src/modules/rbac/application/use-cases/refresh-token.usecase';
import { RemoveTenantUseCase } from '../../src/modules/rbac/application/use-cases/remove-tenant.usecase';
import type { TokenService } from '../../src/modules/rbac/application/token.service';
import { SUPER_ADMIN_ROLE } from '../../src/modules/rbac/domain/rbac.constants';
import { Role } from '../../src/modules/rbac/domain/role.entity';
import type { RoleRepository } from '../../src/modules/rbac/domain/role-repository.interface';
import { TenantEntity } from '../../src/modules/rbac/domain/tenant.entity';
import type { TenantRepository } from '../../src/modules/rbac/domain/tenant-repository.interface';
import { User } from '../../src/modules/rbac/domain/user.entity';
import type { UserRepository } from '../../src/modules/rbac/domain/user-repository.interface';
import { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

function makeTenant(id: string, code: string, status = TenantStatus.Enabled): TenantEntity {
  return Object.assign(new TenantEntity(), { id, code, name: code, status, builtin: false });
}

function makeTenantRepository(tenants: TenantEntity[]): TenantRepository {
  return {
    findById: async (id) => tenants.find((tenant) => tenant.id === id) ?? null,
    findByCode: async (code) => tenants.find((tenant) => tenant.code === code) ?? null,
    findByIds: async (ids) => tenants.filter((tenant) => ids.includes(tenant.id)),
    findAll: async () => tenants,
    existsByCode: async (code) => tenants.some((tenant) => tenant.code === code),
    paginate: async () => [tenants, tenants.length],
    create: (data) => Object.assign(new TenantEntity(), data),
    save: async (tenant) => tenant,
    remove: async () => undefined,
  };
}

function makeRole(id: string, tenantId: string, code: string): Role {
  return Object.assign(new Role(), {
    id,
    tenantId,
    code,
    name: code,
    remark: '',
    permissions: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function makeUser(id: string, tenantId: string, roles: Role[]): User {
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

test('登录未指定租户编码时只解析默认租户，不能退化为全库账号查询', async () => {
  const defaultTenant = makeTenant(DEFAULT_TENANT_ID, DEFAULT_TENANT_CODE);
  const resolver = new TenantResolver(makeTenantRepository([defaultTenant]));

  assert.equal(await resolver.resolveOptionalId(), DEFAULT_TENANT_ID);
});

test('租户 ID 不存在时必须拒绝，不能把已删除租户继续视为可用', async () => {
  const resolver = new TenantResolver(makeTenantRepository([]));

  await assert.rejects(
    resolver.assertTenantEnabled('missing-tenant'),
    (error: unknown) => error instanceof UnauthorizedException,
  );
});

test('非默认租户即使存在 admin 角色也不能获得平台超管旁路', async () => {
  const adminRole = makeRole('role-admin', 'tenant-a', SUPER_ADMIN_ROLE);
  const user = makeUser('user-a', 'tenant-a', [adminRole]);
  const userRepo: Pick<UserRepository, 'findById'> = { findById: async () => user };
  const roleRepo: Pick<RoleRepository, 'findByIds'> = {
    findByIds: async () => [adminRole],
  };
  const resolver = new PermissionResolver(userRepo, roleRepo);

  assert.equal((await resolver.resolve(user.id)).isSuper, false);
});

test('通用角色创建入口允许补建内置编码，同编码角色可重复创建', async () => {
  const saved: Role[] = [makeRole('role-admin', 'tenant-a', SUPER_ADMIN_ROLE)];
  const roleRepo: Pick<RoleRepository, 'create' | 'save'> = {
    create: (data: Partial<Role>) =>
      Object.assign(
        makeRole(`created-role-${saved.length}`, 'tenant-a', data.code ?? 'role'),
        data,
      ),
    save: async (role: Role) => {
      saved.push(role);
      return role;
    },
  };
  const tenantRepo: Pick<TenantRepository, 'findById'> = {
    findById: async () => null,
  };
  const tenantContext = new TenantContextService();
  const useCase = new CreateRoleUseCase(roleRepo, tenantRepo, tenantContext);

  await tenantContext.run({ tenantId: 'tenant-a', isSuper: false }, async () => {
    const created = await useCase.execute({ code: 'service', name: '客服' });
    assert.equal(created.code, 'service');
    assert.equal(created.isBuiltin, true);
    assert.equal(created.isSuper, false);

    const duplicated = await useCase.execute({ code: SUPER_ADMIN_ROLE, name: '第二个 admin' });
    assert.equal(duplicated.code, SUPER_ADMIN_ROLE);
    assert.equal(duplicated.deletable, true, '非默认租户的 admin 不是平台超管，可删');
    assert.equal(saved.filter((role) => role.code === SUPER_ADMIN_ROLE).length, 2);
  });
});

test('用户只能绑定与自己同租户的角色，平台超管也不能建立跨租户关联', async () => {
  const user = makeUser('user-a', 'tenant-a', []);
  const foreignRole = makeRole('role-b', 'tenant-b', 'service');
  let saved = false;
  const userRepo: Pick<UserRepository, 'findById' | 'save'> = {
    findById: async () => user,
    save: async (entity: User) => {
      saved = true;
      return entity;
    },
  };
  const roleRepo: Pick<RoleRepository, 'findByIds'> = {
    findByIds: async () => [foreignRole],
  };
  const permissionResolver: Pick<PermissionResolver, 'invalidate'> = {
    invalidate: async () => undefined,
  };
  const useCase = new AssignUserRolesUseCase(userRepo, roleRepo, permissionResolver);

  await assert.rejects(
    useCase.execute(user.id, [foreignRole.id]),
    (error: unknown) => error instanceof ForbiddenException,
  );
  assert.equal(saved, false);
});

test('刷新令牌中的租户必须与用户当前租户一致', async () => {
  const user = makeUser('user-a', 'tenant-a', []);
  const userRepo: Pick<UserRepository, 'findById'> = { findById: async () => user };
  const token: Pick<TokenService, 'verifyRefresh' | 'issueTokenPair'> = {
    verifyRefresh: async () => ({
      sub: user.id,
      username: user.username,
      tenantId: user.tenantId,
      type: 'refresh' as const,
    }),
    issueTokenPair: async () => {
      throw new Error('租户不一致时不应签发令牌');
    },
  };
  const tenants = new TenantResolver(makeTenantRepository([makeTenant('tenant-a', 'tenant-a')]));
  const tenantContext = new TenantContextService();
  const useCase = new RefreshTokenUseCase(userRepo, token, tenants, tenantContext);

  await tenantContext.run({ tenantId: 'tenant-b', isSuper: false }, async () => {
    await assert.rejects(
      useCase.execute('refresh-token'),
      (error: unknown) => error instanceof UnauthorizedException,
    );
  });
});

test('刷新令牌不能绕过已停用租户', async () => {
  const user = makeUser('user-a', 'tenant-a', []);
  const userRepo: Pick<UserRepository, 'findById'> = { findById: async () => user };
  const token: Pick<TokenService, 'verifyRefresh' | 'issueTokenPair'> = {
    verifyRefresh: async () => ({
      sub: user.id,
      username: user.username,
      tenantId: user.tenantId,
      type: 'refresh' as const,
    }),
    issueTokenPair: async () => {
      throw new Error('停用租户不应签发令牌');
    },
  };
  const tenants = new TenantResolver(
    makeTenantRepository([makeTenant('tenant-a', 'tenant-a', TenantStatus.Disabled)]),
  );
  const tenantContext = new TenantContextService();
  const useCase = new RefreshTokenUseCase(userRepo, token, tenants, tenantContext);

  await tenantContext.run({ tenantId: user.tenantId, isSuper: false }, async () => {
    await assert.rejects(
      useCase.execute('refresh-token'),
      (error: unknown) => error instanceof UnauthorizedException,
    );
  });
});

test('租户不允许物理删除，只能通过更新状态停用', async () => {
  const tenant = makeTenant('tenant-a', 'tenant-a');
  let removed = false;
  const repo = {
    ...makeTenantRepository([tenant]),
    remove: async () => {
      removed = true;
    },
  };
  const useCase = new RemoveTenantUseCase(repo);

  await assert.rejects(useCase.execute(tenant.id));
  assert.equal(removed, false);
});
