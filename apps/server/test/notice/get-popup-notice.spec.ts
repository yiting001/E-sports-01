import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_TENANT_ID } from '@app/contracts';
import { GetPopupNoticeUseCase } from '../../src/modules/notice/application/use-cases/get-popup-notice.usecase';
import { NoticeEntity } from '../../src/modules/notice/domain/notice.entity';
import type { NoticeRepository } from '../../src/modules/notice/domain/notice-repository.interface';

function createNotice(tenantId: string): NoticeEntity {
  return Object.assign(new NoticeEntity(), {
    id: 'notice-id',
    tenantId,
    title: '停机维护',
    content: '<p>今晚维护</p>',
    enabled: true,
    popup: true,
    popupFlame: false,
    sort: 0,
    createdAt: new Date('2026-07-20T00:00:00.000Z'),
    updatedAt: new Date('2026-07-21T00:00:00.000Z'),
  });
}

function createUseCase(result: NoticeEntity | null): {
  useCase: GetPopupNoticeUseCase;
  calls: () => number;
} {
  let callCount = 0;
  const repo: NoticeRepository = {
    findById: async () => null,
    paginate: async () => [[], 0],
    findEnabled: async () => [],
    findLatestPopup: async () => {
      callCount += 1;
      return result;
    },
    create: (data) => Object.assign(new NoticeEntity(), data),
    save: async (entity) => entity,
    remove: async () => undefined,
  };
  return { useCase: new GetPopupNoticeUseCase(repo), calls: () => callCount };
}

void test('返回当前租户仓储选中的弹窗公告', async () => {
  const { useCase, calls } = createUseCase(createNotice(DEFAULT_TENANT_ID));

  const view = await useCase.execute();

  assert.equal(calls(), 1);
  assert.equal(view?.id, 'notice-id');
  assert.equal(view?.updatedAt, '2026-07-21T00:00:00.000Z');
  assert.equal(view?.popupFlame, false);
});

void test('本租户没有启用中的弹窗公告时返回 null', async () => {
  const { useCase, calls } = createUseCase(null);

  const view = await useCase.execute();

  assert.equal(calls(), 1);
  assert.equal(view, null);
});
