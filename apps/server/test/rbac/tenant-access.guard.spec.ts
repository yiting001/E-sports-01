import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { DEFAULT_TENANT_CODE, DEFAULT_TENANT_ID, TenantStatus } from '@app/contracts';
import { TenantResolver } from '../../src/modules/rbac/application/tenant-resolver.service';
import { TenantEntity } from '../../src/modules/rbac/domain/tenant.entity';
import type { TenantRepository } from '../../src/modules/rbac/domain/tenant-repository.interface';
import { TenantAccessGuard } from '../../src/modules/rbac/interfaces/auth/tenant-access.guard';
import { AUTH_METADATA } from '../../src/modules/rbac/interfaces/auth/metadata';
import { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

interface RequestInput {
  headers?: Record<string, string | string[]>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

class TestController {}

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

function makeContext(
  input: RequestInput,
  metadata: { tenantPublic?: boolean; platformOnly?: boolean } = {},
): ExecutionContext {
  const handler = () => undefined;
  if (metadata.tenantPublic) {
    Reflect.defineMetadata(AUTH_METADATA.tenantPublic, true, handler);
  }
  if (metadata.platformOnly) {
    Reflect.defineMetadata(AUTH_METADATA.platformOnly, true, handler);
  }
  const request = {
    headers: input.headers ?? {},
    query: input.query ?? {},
    body: input.body ?? {},
  };
  const context = new ExecutionContextHost([request], TestController, handler);
  context.setType('http');
  return context;
}

function makeGuard(tenants: TenantEntity[], context: TenantContextService): TenantAccessGuard {
  return new TenantAccessGuard(
    new Reflector(),
    new TenantResolver(makeTenantRepository(tenants)),
    context,
  );
}

test('租户公开路由未指定编码时建立默认租户上下文', async () => {
  const tenant = new TenantContextService();
  const guard = makeGuard([makeTenant(DEFAULT_TENANT_ID, DEFAULT_TENANT_CODE)], tenant);

  await tenant.run({ tenantId: null, isSuper: false }, async () => {
    assert.equal(await guard.canActivate(makeContext({}, { tenantPublic: true })), true);
    assert.equal(tenant.tenantId, DEFAULT_TENANT_ID);
  });
});

test('租户公开路由按请求头建立指定租户上下文并回填认证请求体', async () => {
  const tenant = new TenantContextService();
  const body: Record<string, unknown> = {};
  const guard = makeGuard([makeTenant('tenant-a', 'tenant-a')], tenant);

  await tenant.run({ tenantId: null, isSuper: false }, async () => {
    assert.equal(
      await guard.canActivate(
        makeContext({ headers: { 'x-tenant-code': 'tenant-a' }, body }, { tenantPublic: true }),
      ),
      true,
    );
    assert.equal(tenant.tenantId, 'tenant-a');
    assert.equal(body.tenantCode, 'tenant-a');
  });
});

test('租户公开路由拒绝未知或停用租户', async () => {
  const tenant = new TenantContextService();
  const guard = makeGuard(
    [makeTenant('tenant-disabled', 'tenant-disabled', TenantStatus.Disabled)],
    tenant,
  );

  await tenant.run({ tenantId: null, isSuper: false }, async () => {
    await assert.rejects(
      guard.canActivate(
        makeContext({ headers: { 'x-tenant-code': 'tenant-disabled' } }, { tenantPublic: true }),
      ),
      (error: unknown) => error instanceof UnauthorizedException,
    );
  });
});

test('租户公开路由拒绝重复或非字符串租户编码，不回退默认租户', async () => {
  const tenant = new TenantContextService();
  const guard = makeGuard([makeTenant(DEFAULT_TENANT_ID, DEFAULT_TENANT_CODE)], tenant);

  await tenant.run({ tenantId: null, isSuper: false }, async () => {
    for (const context of [
      makeContext({ query: { tenantCode: ['tenant-a', 'tenant-b'] } }, { tenantPublic: true }),
      makeContext({ body: { tenantCode: 42 } }, { tenantPublic: true }),
    ]) {
      await assert.rejects(
        guard.canActivate(context),
        (error: unknown) => error instanceof BadRequestException,
      );
      assert.equal(tenant.tenantId, null);
    }
  });
});

test('普通公开回调不解析租户标识，保持原有支付回调协议', async () => {
  const tenant = new TenantContextService();
  const guard = makeGuard([], tenant);

  await tenant.run({ tenantId: null, isSuper: false }, async () => {
    assert.equal(
      await guard.canActivate(makeContext({ headers: { 'x-tenant-code': 'unknown-tenant' } })),
      true,
    );
    assert.equal(tenant.tenantId, null);
  });
});

test('JWT 租户与显式请求租户冲突时拒绝访问', async () => {
  const tenant = new TenantContextService();
  const guard = makeGuard(
    [makeTenant('tenant-a', 'tenant-a'), makeTenant('tenant-b', 'tenant-b')],
    tenant,
  );

  await tenant.run({ tenantId: 'tenant-a', isSuper: false }, async () => {
    await assert.rejects(
      guard.canActivate(makeContext({ headers: { 'x-tenant-code': 'tenant-b' } })),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });
});

test('平台目录仅默认租户超级管理员可以访问', async () => {
  const tenant = new TenantContextService();
  const guard = makeGuard(
    [makeTenant(DEFAULT_TENANT_ID, DEFAULT_TENANT_CODE), makeTenant('tenant-a', 'tenant-a')],
    tenant,
  );

  await tenant.run({ tenantId: 'tenant-a', isSuper: false }, async () => {
    await assert.rejects(
      guard.canActivate(makeContext({}, { platformOnly: true })),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });
  await tenant.run({ tenantId: DEFAULT_TENANT_ID, isSuper: false }, async () => {
    await assert.rejects(
      guard.canActivate(makeContext({}, { platformOnly: true })),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });
  await tenant.run({ tenantId: DEFAULT_TENANT_ID, isSuper: true }, async () => {
    assert.equal(await guard.canActivate(makeContext({}, { platformOnly: true })), true);
  });
});
