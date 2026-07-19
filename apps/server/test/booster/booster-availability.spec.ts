import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOSTER_LEVEL_DEFAULTS,
  BoosterContactType,
  BoosterGender,
  BoosterStatus,
} from '@app/contracts';
import { ForbiddenException } from '@nestjs/common';
import type { UserDirectory } from '../../src/modules/rbac/application/user-directory.service';
import type { BoosterPolicyService } from '../../src/modules/booster/application/booster-policy.service';
import { UpdateMyBoosterAvailabilityUseCase } from '../../src/modules/booster/application/use-cases/update-my-booster-availability.usecase';
import { BoosterApplicationEntity } from '../../src/modules/booster/domain/booster-application.entity';
import type { BoosterRepository } from '../../src/modules/booster/domain/booster-repository.interface';

function createRecord(status: BoosterStatus): BoosterApplicationEntity {
  return Object.assign(new BoosterApplicationEntity(), {
    id: 'application-id',
    tenantId: 'tenant-id',
    userId: 'booster-id',
    legacyGameNickname: '',
    legacyGameName: '',
    legacyRank: '',
    applicantName: '李四',
    gender: BoosterGender.Male,
    serviceRegions: ['delta-mobile'],
    intro: '移动端接单服务',
    contactType: BoosterContactType.Phone,
    contactValue: '13800000000',
    materialImage: '',
    voiceUrl: '',
    invitationCode: '',
    status,
    rejectReason: '',
    reviewedBy: '',
    reviewedAt: null,
    completedOrders: 0,
    depositFen: 0,
    acceptingOrders: false,
    createdAt: new Date('2026-07-19T00:00:00.000Z'),
    updatedAt: new Date('2026-07-19T00:00:00.000Z'),
  });
}

function createUseCase(record: BoosterApplicationEntity): {
  useCase: UpdateMyBoosterAvailabilityUseCase;
  savedStates: boolean[];
} {
  const savedStates: boolean[] = [];
  const repo = {
    findByUserId: async () => record,
    save: async (entity: BoosterApplicationEntity) => {
      savedStates.push(entity.acceptingOrders);
      return entity;
    },
  } as unknown as BoosterRepository;
  const users = {
    resolveProfiles: async () =>
      new Map([['booster-id', { username: 'booster', nickname: '打手一号' }]]),
  } as unknown as UserDirectory;
  const policy = {
    getLevelTiers: async () => BOOSTER_LEVEL_DEFAULTS,
  } as unknown as BoosterPolicyService;
  return {
    useCase: new UpdateMyBoosterAvailabilityUseCase(repo, users, policy),
    savedStates,
  };
}

test('审核通过的打手可自主上线且响应返回持久状态', async () => {
  const fixture = createUseCase(createRecord(BoosterStatus.Approved));

  const result = await fixture.useCase.execute('booster-id', { acceptingOrders: true });

  assert.equal(result.acceptingOrders, true);
  assert.deepEqual(fixture.savedStates, [true]);
});

test('重复设置相同状态保持幂等且不重复写库', async () => {
  const record = createRecord(BoosterStatus.Approved);
  record.acceptingOrders = true;
  const fixture = createUseCase(record);

  const result = await fixture.useCase.execute('booster-id', { acceptingOrders: true });

  assert.equal(result.acceptingOrders, true);
  assert.deepEqual(fixture.savedStates, []);
});

test('未审核通过的申请不能切换上线状态', async () => {
  const fixture = createUseCase(createRecord(BoosterStatus.Pending));

  await assert.rejects(
    fixture.useCase.execute('booster-id', { acceptingOrders: true }),
    (error: unknown) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.deepEqual(fixture.savedStates, []);
});
