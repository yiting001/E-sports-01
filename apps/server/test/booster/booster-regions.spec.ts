import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { BOOSTER_SERVICE_REGIONS, CONFIG_KEYS } from '@app/contracts';
import { BoosterPolicyService } from '../../src/modules/booster/application/booster-policy.service';
import type { ConfigService } from '../../src/modules/config/application/config.service';

function createPolicy(stored: unknown): {
  policy: BoosterPolicyService;
  written: Record<string, unknown>;
} {
  const written: Record<string, unknown> = {};
  const config = {
    getJson: async <T>(_key: string, fallback: T) =>
      stored === undefined ? fallback : (stored as T),
    setJson: async (key: string, value: unknown) => {
      written[key] = value;
    },
  } as unknown as ConfigService;
  return { policy: new BoosterPolicyService(config), written };
}

test('falls back to default regions when unset or invalid', async () => {
  const { policy } = createPolicy(undefined);
  assert.deepEqual(await policy.getServiceRegionOptions(), [
    ...BOOSTER_SERVICE_REGIONS,
  ]);

  const { policy: broken } = createPolicy([{ value: '', label: '' }, 42]);
  assert.deepEqual(await broken.getServiceRegionOptions(), [
    ...BOOSTER_SERVICE_REGIONS,
  ]);
});

test('sanitizes stored options: trims, dedupes and drops illegal values', async () => {
  const { policy } = createPolicy([
    { value: ' delta-mobile ', label: ' 三角洲 - 手机端 ' },
    { value: 'delta-mobile', label: '重复值' },
    { value: 'BAD_VALUE', label: '非法字符' },
    { value: 'valorant', label: '无畏契约' },
  ]);
  assert.deepEqual(await policy.getServiceRegionOptions(), [
    { value: 'delta-mobile', label: '三角洲 - 手机端' },
    { value: 'valorant', label: '无畏契约' },
  ]);
});

test('saves valid options to config after trimming', async () => {
  const { policy, written } = createPolicy(undefined);
  const saved = await policy.setServiceRegionOptions([
    { value: ' delta-pc ', label: ' 三角洲 - 电脑端 ' },
    { value: 'valorant', label: '无畏契约' },
  ]);
  assert.deepEqual(saved, [
    { value: 'delta-pc', label: '三角洲 - 电脑端' },
    { value: 'valorant', label: '无畏契约' },
  ]);
  assert.deepEqual(written[CONFIG_KEYS.booster.serviceRegionOptions], saved);
});

test('rejects empty list, duplicate or illegal values and empty labels', async () => {
  const { policy } = createPolicy(undefined);
  await assert.rejects(
    policy.setServiceRegionOptions([]),
    BadRequestException,
  );
  await assert.rejects(
    policy.setServiceRegionOptions([
      { value: 'delta-pc', label: 'A' },
      { value: 'delta-pc', label: 'B' },
    ]),
    BadRequestException,
  );
  await assert.rejects(
    policy.setServiceRegionOptions([{ value: 'Bad Value', label: 'A' }]),
    BadRequestException,
  );
  await assert.rejects(
    policy.setServiceRegionOptions([{ value: 'delta-pc', label: '   ' }]),
    BadRequestException,
  );
});
