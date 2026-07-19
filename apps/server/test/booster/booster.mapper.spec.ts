import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOSTER_LEVEL_DEFAULTS,
  BoosterContactType,
  BoosterGender,
  BoosterStatus,
} from '@app/contracts';
import { getMetadataArgsStorage } from 'typeorm';
import { toBoosterView } from '../../src/modules/booster/application/booster.mapper';
import {
  normalizeBoosterServiceRegions,
  toLegacyGameName,
  toLegacyGameNickname,
} from '../../src/modules/booster/application/booster-compatibility';
import { BoosterApplicationEntity } from '../../src/modules/booster/domain/booster-application.entity';

test('maps structured onboarding fields without exposing legacy columns', () => {
  const entity = new BoosterApplicationEntity();
  entity.id = 'application-id';
  entity.tenantId = 'tenant-id';
  entity.userId = 'user-id';
  entity.applicantName = '李四';
  entity.gender = BoosterGender.Female;
  entity.serviceRegions = ['delta-mobile', 'delta-pc'];
  entity.intro = '电脑端和移动端均可接单';
  entity.contactType = BoosterContactType.Wechat;
  entity.contactValue = 'booster_wechat';
  entity.materialImage = '/static/material.png';
  entity.voiceUrl = '/static/voice.mp3';
  entity.invitationCode = 'INVITE01';
  entity.legacyGameNickname = 'legacy-name';
  entity.legacyGameName = 'legacy-game';
  entity.legacyRank = 'legacy-rank';
  entity.status = BoosterStatus.Pending;
  entity.rejectReason = '';
  entity.reviewedBy = '';
  entity.reviewedAt = null;
  entity.completedOrders = 0;
  entity.depositFen = 0;
  entity.acceptingOrders = false;
  entity.createdAt = new Date('2026-07-17T00:00:00.000Z');
  entity.updatedAt = new Date('2026-07-17T00:00:00.000Z');

  const view = toBoosterView(entity, BOOSTER_LEVEL_DEFAULTS, {
    username: 'booster-user',
    nickname: '小李',
  });

  assert.equal(view.applicantName, '李四');
  assert.deepEqual(view.serviceRegions, ['delta-mobile', 'delta-pc']);
  assert.equal(view.contactType, BoosterContactType.Wechat);
  assert.equal(view.contactValue, 'booster_wechat');
  assert.equal(view.materialImage, '/static/material.png');
  assert.equal(view.voiceUrl, '/static/voice.mp3');
  assert.equal(view.invitationCode, 'INVITE01');
  assert.equal(view.acceptingOrders, false);
  assert.equal('gameNickname' in view, false);
});

test('keeps compatibility columns within the legacy schema limits', () => {
  assert.equal(toLegacyGameNickname('a'.repeat(64)), 'a'.repeat(32));
  assert.equal(toLegacyGameNickname(`${'测'.repeat(31)}😀尾`), `${'测'.repeat(31)}😀`);
  assert.equal(toLegacyGameName(['delta-mobile', 'delta-pc']), 'delta-mobile,delta-pc');
});

test('filters legacy free-text regions from public views', () => {
  assert.deepEqual(normalizeBoosterServiceRegions(['legacy-game', 'delta-mobile']), [
    'delta-mobile',
  ]);
});

test('maps the compatibility rank property to the existing rank column', () => {
  const metadata = getMetadataArgsStorage().columns.find(
    (column) => column.target === BoosterApplicationEntity && column.propertyName === 'legacyRank',
  );
  assert.equal(metadata?.options.name, 'rank');
});
