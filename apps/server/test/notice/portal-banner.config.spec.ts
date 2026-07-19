import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PORTAL_BANNER_LIMITS } from '@app/contracts';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  normalizePortalBanner,
  parsePortalBannerConfig,
} from '../../src/modules/notice/application/portal-banner.config';
import { UpdateBannerDto } from '../../src/modules/notice/interfaces/dto/update-banner.dto';

const ACTIVITY_ID = '84b71ca4-0a31-4f4f-8bb0-4a688d1a6a65';

test('converts a historical image URL into one unlinked banner item', () => {
  assert.deepEqual(parsePortalBannerConfig('/static/banner.jpg'), {
    items: [{ image: '/static/banner.jpg', activityId: '' }],
    intervalSeconds: PORTAL_BANNER_LIMITS.defaultIntervalSeconds,
  });
});

test('supports the historical object shape without changing its image', () => {
  assert.deepEqual(parsePortalBannerConfig(JSON.stringify({ image: 'https://cdn/a.jpg' })), {
    items: [{ image: 'https://cdn/a.jpg', activityId: '' }],
    intervalSeconds: PORTAL_BANNER_LIMITS.defaultIntervalSeconds,
  });
});

test('normalizes edited JSON and removes unsafe or malformed fields', () => {
  assert.deepEqual(
    normalizePortalBanner({
      items: [
        { image: ' /static/a.jpg ', activityId: ` ${ACTIVITY_ID} ` },
        { image: 'javascript:alert(1)', activityId: ACTIVITY_ID },
        { image: '/static/b.jpg', activityId: 'not-a-uuid' },
      ],
      intervalSeconds: 9,
    }),
    {
      items: [
        { image: '/static/a.jpg', activityId: ACTIVITY_ID },
        { image: '/static/b.jpg', activityId: '' },
      ],
      intervalSeconds: PORTAL_BANNER_LIMITS.defaultIntervalSeconds,
    },
  );
});

test('caps directly edited JSON at the configured item limit', () => {
  const banner = normalizePortalBanner({
    items: Array.from({ length: PORTAL_BANNER_LIMITS.itemsMax + 2 }, (_, index) => ({
      image: `/static/${index}.jpg`,
      activityId: '',
    })),
    intervalSeconds: 1,
  });
  assert.equal(banner.items.length, PORTAL_BANNER_LIMITS.itemsMax);
  assert.equal(banner.intervalSeconds, 1);
});

test('accepts a valid update payload and trims nested strings', async () => {
  const dto = plainToInstance(UpdateBannerDto, {
    items: [{ image: ' /static/banner.jpg ', activityId: ` ${ACTIVITY_ID} ` }],
    intervalSeconds: '2',
  });
  const errors = await validate(dto);
  assert.equal(errors.length, 0);
  assert.equal(dto.items[0].image, '/static/banner.jpg');
  assert.equal(dto.items[0].activityId, ACTIVITY_ID);
  assert.equal(dto.intervalSeconds, 2);
});

test('rejects unsafe images, malformed activity IDs and out-of-range intervals', async () => {
  const dto = plainToInstance(UpdateBannerDto, {
    items: [{ image: 'javascript:alert(1)', activityId: 'activity-id' }],
    intervalSeconds: 4,
  });
  const errors = await validate(dto);
  assert.deepEqual(
    new Set(errors.map((error) => error.property)),
    new Set(['items', 'intervalSeconds']),
  );
});
