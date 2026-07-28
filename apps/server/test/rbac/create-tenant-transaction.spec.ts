import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException } from '@nestjs/common';
import {
  TenantProvisioningRepositories,
  TenantProvisioningTransaction,
} from '../../src/modules/rbac/domain/tenant-provisioning-transaction.interface';
import { CreateTenantUseCase } from '../../src/modules/rbac/application/use-cases/create-tenant.usecase';
import { Role } from '../../src/modules/rbac/domain/role.entity';
import { TenantEntity } from '../../src/modules/rbac/domain/tenant.entity';
import { User } from '../../src/modules/rbac/domain/user.entity';
import type { PasswordService } from '../../src/modules/rbac/infrastructure/password.service';

test('初始管理员创建失败时原子回滚租户和基础角色', async () => {
  const tenants: TenantEntity[] = [];
  const roles: Role[] = [];
  const users: User[] = [];
  const repositories: TenantProvisioningRepositories = {
    tenants: {
      existsByCode: async (code) => tenants.some((tenant) => tenant.code === code),
      create: (data) => Object.assign(new TenantEntity(), data),
      save: async (tenant) => {
        tenant.id = `tenant-${tenants.length + 1}`;
        tenants.push(tenant);
        return tenant;
      },
    },
    roles: {
      create: (data) => Object.assign(new Role(), data),
      save: async (role) => {
        role.id = `role-${roles.length + 1}`;
        roles.push(role);
        return role;
      },
    },
    users: {
      create: (data) => Object.assign(new User(), data),
      save: async () => {
        throw new Error('模拟管理员写入失败');
      },
    },
    permissions: {
      findAll: async () => [],
    },
  };
  const transaction: TenantProvisioningTransaction = {
    run: async (work) => {
      const snapshot = {
        tenants: tenants.length,
        roles: roles.length,
        users: users.length,
      };
      try {
        return await work(repositories);
      } catch (error) {
        tenants.splice(snapshot.tenants);
        roles.splice(snapshot.roles);
        users.splice(snapshot.users);
        throw error;
      }
    },
  };
  const password: Pick<PasswordService, 'hash'> = {
    hash: async () => 'password-hash',
  };
  const useCase = new CreateTenantUseCase(transaction, password);

  await assert.rejects(
    useCase.execute({
      code: 'tenant-a',
      name: '租户 A',
      adminPassword: 'Tenant-A#2026',
    }),
    /模拟管理员写入失败/,
  );
  assert.deepEqual(tenants, []);
  assert.deepEqual(roles, []);
  assert.deepEqual(users, []);
  assert.equal(await repositories.tenants.existsByCode('tenant-a'), false);
});

test('并发创建相同租户编码时把数据库唯一冲突转换为业务冲突', async () => {
  const transaction: TenantProvisioningTransaction = {
    run: async () => {
      throw Object.assign(new Error('duplicate key'), { code: '23505' });
    },
  };
  const password: Pick<PasswordService, 'hash'> = {
    hash: async () => 'password-hash',
  };
  const useCase = new CreateTenantUseCase(transaction, password);

  await assert.rejects(
    useCase.execute({
      code: 'tenant-a',
      name: '租户 A',
      adminPassword: 'Tenant-A#2026',
    }),
    (error: unknown) => error instanceof ConflictException,
  );
});
