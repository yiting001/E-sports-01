import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_TENANT_ID } from '@app/contracts';
import { UnauthorizedException } from '@nestjs/common';
import { GetPopupNoticeUseCase } from '../../src/modules/notice/application/use-cases/get-popup-notice.usecase';
import { NoticeEntity } from '../../src/modules/notice/domain/notice.entity';
import type { NoticeRepository } from '../../src/modules/notice/domain/notice-repository.interface';
import type { TenantResolver } from '../../src/modules/rbac/application/tenant-resolver.service';

function createNotice(tenantId: string): NoticeEntity {
  return Object.assign(new NoticeEntity(), {
    id: 'notice-id',
    tenantId,
    title: '停机维护',
    content: '<p>今晚维护</p>',
    enabled: true,
    popup: true,
    sort: 0,
    createdAt: new Date('2026-07-20T00:00:00.000Z'),
    updatedAt: new Date('2026-07-21T00:00:00.000Z'),
  });
}

function createUseCase(resolved?: string | UnauthorizedException): {
  useCase: GetPopupNoticeUseCase;
  queriedTenantIds: string[];
} {
  const queriedTenantIds: string[] = [];
  const repo = {
    findLatestPopup: async (tenantId: string) => {
      queriedTenantIds.push(tenantId);
      return createNotice(tenantId);
    },
  } as unknown as NoticeRepository;
  const tenantResolver = {
    resolveOptionalId: async () => {
      if (resolved instanceof UnauthorizedException) {
        throw resolved;
      }
      return resolved;
    },
  } as unknown as TenantResolver;
  return { useCase: new GetPopupNoticeUseCase(repo, tenantResolver), queriedTenantIds };
}

void test('租户编码缺省时按内置默认租户查询弹窗公告', async () => {
  const { useCase, queriedTenantIds } = createUseCase(undefined);

  const view = await useCase.execute();

  assert.deepEqual(queriedTenantIds, [DEFAULT_TENANT_ID]);
  assert.equal(view?.id, 'notice-id');
  assert.equal(view?.updatedAt, '2026-07-21T00:00:00.000Z');
});

void test('指定租户编码时只查询该租户的弹窗公告', async () => {
  const { useCase, queriedTenantIds } = createUseCase('tenant-a');

  await useCase.execute('a');

  assert.deepEqual(queriedTenantIds, ['tenant-a']);
});

void test('租户不存在或已停用时拒绝下发公告', async () => {
  const { useCase } = createUseCase(new UnauthorizedException('租户不存在或已停用'));

  await assert.rejects(() => useCase.execute('unknown'), UnauthorizedException);
});

void test('本租户没有启用中的弹窗公告时返回 null', async () => {
  const repo = {
    findLatestPopup: async () => null,
  } as unknown as NoticeRepository;
  const tenantResolver = {
    resolveOptionalId: async () => undefined,
  } as unknown as TenantResolver;

  const view = await new GetPopupNoticeUseCase(repo, tenantResolver).execute();

  assert.equal(view, null);
});
