import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sanitizeHttpLogBody,
  sanitizeLogValue,
} from '../../src/modules/observability/interfaces/logging.interceptor';

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

test('redacts refund reason only on customer request and admin reject routes', () => {
  assert.deepEqual(
    sanitizeHttpLogBody('POST', '/api/order/9e5cd37c-c22f-4cd7-8730-f876f85834fe/refund', {
      reason: '包含用户私密经历的退款原因',
      status: 'pending_review',
    }),
    { reason: '***', status: 'pending_review' },
  );
  assert.deepEqual(
    sanitizeHttpLogBody(
      'POST',
      '/api/order/admin/9e5cd37c-c22f-4cd7-8730-f876f85834fe/refund/reject',
      {
        reason: '内部审核驳回说明',
      },
    ),
    { reason: '***' },
  );
});

test('keeps ordinary reason fields diagnosable outside exact refund routes', () => {
  assert.deepEqual(
    sanitizeHttpLogBody('POST', '/api/feedback/feedback-id/penalty', {
      reason: '服务态度不符合要求',
      password: 'must-not-leak',
    }),
    { reason: '服务态度不符合要求', password: '***' },
  );
  assert.deepEqual(
    sanitizeHttpLogBody('POST', '/api/order/order-id/refund/retry', {
      reason: '非目标路由诊断原因',
    }),
    { reason: '非目标路由诊断原因' },
  );
});
