import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOSTER_LEVEL_DEFAULTS, BoosterGender } from '@app/contracts';
import { ForbiddenException } from '@nestjs/common';
import type { BoosterDepositGuard } from '../../src/modules/booster/application/booster-deposit.service';
import {
  resolveBoosterDisplayName,
  toBoosterPublicView,
} from '../../src/modules/booster/application/booster-public.mapper';
import type { BoosterRealnameGuard } from '../../src/modules/booster/application/booster-realname.service';
import { BoosterSelectionService } from '../../src/modules/booster/application/booster-selection.service';
import type {
  BoosterDirectoryQuery,
  BoosterDirectoryRecord,
} from '../../src/modules/booster/domain/booster-directory.query';

const record: BoosterDirectoryRecord = {
  userId: '11111111-1111-4111-8111-111111111111',
  nickname: '小安',
  avatar: '/static/avatar.png',
  gender: BoosterGender.Female,
  serviceRegions: ['delta-mobile'],
  intro: '擅长移动端组队服务',
  completedOrders: 12,
  voiceUrl: '/static/voice.mp3',
  acceptingOrders: true,
};

test('公开打手投影只映射展示字段并包含等级与自主上线状态', () => {
  const view = toBoosterPublicView(record, BOOSTER_LEVEL_DEFAULTS);

  assert.deepEqual(Object.keys(view).sort(), [
    'avatar',
    'completedOrders',
    'displayName',
    'gender',
    'intro',
    'level',
    'levelName',
    'online',
    'selectable',
    'serviceRegions',
    'unavailableReason',
    'userId',
    'voiceUrl',
  ]);
  assert.equal(view.displayName, '小安');
  assert.equal(view.online, true);
  assert.equal('applicantName' in view, false);
  assert.equal('contactValue' in view, false);
  assert.equal('materialImage' in view, false);
});

test('昵称为空时生成稳定显示名且不暴露用户名或真实姓名', () => {
  assert.equal(resolveBoosterDisplayName({ ...record, nickname: '' }), '打手111111');
});

test('指定打手校验本人、可见状态、区服、实名与押金', async () => {
  const guardCalls: string[] = [];
  const directory = {
    findByUserId: async (userId: string) => (userId === record.userId ? record : null),
  } as unknown as BoosterDirectoryQuery;
  const realname = {
    assertApproved: async (userId: string) => {
      guardCalls.push(`realname:${userId}`);
    },
  } as unknown as BoosterRealnameGuard;
  const deposit = {
    assertPaid: async (userId: string) => {
      guardCalls.push(`deposit:${userId}`);
    },
  } as unknown as BoosterDepositGuard;
  const service = new BoosterSelectionService(directory, realname, deposit);

  await assert.rejects(
    service.assertSelectable(record.userId, record.userId, 'delta-mobile'),
    /不能选择自己/,
  );
  await assert.rejects(
    service.assertSelectable('owner-id', '22222222-2222-4222-8222-222222222222', 'delta-mobile'),
    /不存在或当前不可接单/,
  );
  await assert.rejects(
    service.assertSelectable('owner-id', record.userId, 'delta-pc'),
    /不支持当前游戏区服/,
  );

  const selected = await service.assertSelectable('owner-id', record.userId, 'delta-mobile');
  assert.deepEqual(selected, { userId: record.userId, displayName: '小安' });
  assert.deepEqual(guardCalls, [`realname:${record.userId}`, `deposit:${record.userId}`]);
});

test('目录只转换已知资格异常并向上抛出基础设施故障', async () => {
  const directory = {
    findByUserId: async () => record,
  } as unknown as BoosterDirectoryQuery;
  const deposit = {
    assertPaid: async () => undefined,
  } as unknown as BoosterDepositGuard;
  const knownFailure = new BoosterSelectionService(
    directory,
    {
      assertApproved: async () => {
        throw new ForbiddenException('请先完成实名认证');
      },
    } as unknown as BoosterRealnameGuard,
    deposit,
  );
  const unavailable = await knownFailure.availabilityFor('owner-id', record);
  assert.deepEqual(unavailable, {
    selectable: false,
    unavailableReason: '请先完成实名认证',
  });

  const infrastructureFailure = new BoosterSelectionService(
    directory,
    {
      assertApproved: async () => {
        throw new Error('database unavailable');
      },
    } as unknown as BoosterRealnameGuard,
    deposit,
  );
  await assert.rejects(
    infrastructureFailure.availabilityFor('owner-id', record),
    /database unavailable/,
  );
});

test('下线打手不可被选择且不会继续执行实名和押金检查', async () => {
  let guardCalls = 0;
  const offlineRecord = { ...record, acceptingOrders: false };
  const service = new BoosterSelectionService(
    {
      findByUserId: async () => offlineRecord,
    } as unknown as BoosterDirectoryQuery,
    {
      assertApproved: async () => {
        guardCalls += 1;
      },
    } as unknown as BoosterRealnameGuard,
    {
      assertPaid: async () => {
        guardCalls += 1;
      },
    } as unknown as BoosterDepositGuard,
  );

  await assert.rejects(
    service.assertSelectable('owner-id', offlineRecord.userId, 'delta-mobile'),
    /打手当前未上线/,
  );
  assert.equal(guardCalls, 0);
  assert.equal(toBoosterPublicView(offlineRecord, BOOSTER_LEVEL_DEFAULTS).online, false);
});

test('历史空区服打手在目录中明确不可选择', async () => {
  const directory = {
    findByUserId: async () => ({ ...record, serviceRegions: [] }),
  } as unknown as BoosterDirectoryQuery;
  const service = new BoosterSelectionService(
    directory,
    { assertApproved: async () => undefined } as unknown as BoosterRealnameGuard,
    { assertPaid: async () => undefined } as unknown as BoosterDepositGuard,
  );

  assert.deepEqual(
    await service.availabilityFor('owner-id', { ...record, serviceRegions: [] }),
    {
      selectable: false,
      unavailableReason: '打手暂未配置接单区服',
    },
  );
});
