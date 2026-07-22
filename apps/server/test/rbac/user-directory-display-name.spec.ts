import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPublicUserDisplayName } from '@app/contracts';

test('公开用户展示名优先昵称，缺失时只使用稳定用户编号', () => {
  assert.equal(
    formatPublicUserDisplayName('11111111-2222-4333-8444-555555123456', ' 用户0942 '),
    '用户0942',
  );
  assert.equal(
    formatPublicUserDisplayName('11111111-2222-4333-8444-555555123456', ''),
    '用户123456',
  );
  assert.equal(
    formatPublicUserDisplayName('11111111-2222-4333-8444-555555123456', 'sms_18500000942'),
    '用户123456',
  );
  assert.equal(
    formatPublicUserDisplayName('11111111-2222-4333-8444-555555123456', '18500000942'),
    '用户123456',
  );
  assert.doesNotMatch(
    formatPublicUserDisplayName('11111111-2222-4333-8444-555555123456', ''),
    /1\d{10}|sms_/,
  );
});
