import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeLogValue } from '../../src/modules/observability/interfaces/logging.interceptor';

test('redacts booster personal data from nested error log bodies', () => {
  assert.deepEqual(
    sanitizeLogValue({
      applicantName: '张三',
      gender: 'male',
      serviceRegions: ['delta-mobile'],
      contactType: 'phone',
      intro: '可晚间接单',
      nested: {
        contactValue: '13800138000',
        invitationCode: 'INVITE01',
        materialImage: '/static/private-proof.png',
      },
      status: 'pending',
    }),
    {
      applicantName: '***',
      gender: '***',
      serviceRegions: '***',
      contactType: '***',
      intro: '***',
      nested: {
        contactValue: '***',
        invitationCode: '***',
        materialImage: '***',
      },
      status: 'pending',
    },
  );
});
