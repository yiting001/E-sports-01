import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FeedbackStatus,
  FeedbackType,
  PenaltySource,
  type CreateFeedbackPenaltyBody,
} from '@app/contracts';
import { resolveFeedbackPenaltyAttempt } from '../../src/modules/feedback/domain/feedback-penalty.policy';
import { FeedbackEntity } from '../../src/modules/feedback/domain/feedback.entity';

const request: CreateFeedbackPenaltyBody = {
  amountFen: 1_000,
  source: PenaltySource.Balance,
  reason: '服务态度不符合要求',
  replyContent: '投诉已核实，平台已完成扣款处理。',
};

function makeFeedback(overrides: Partial<FeedbackEntity> = {}): FeedbackEntity {
  return Object.assign(new FeedbackEntity(), {
    id: 'feedback-1',
    type: FeedbackType.Booster,
    status: FeedbackStatus.Pending,
    orderId: 'order-1',
    orderNo: 'O-20260721-1',
    boosterUserId: 'booster-1',
    boosterName: '打手甲',
    penaltyId: '',
    replyContent: '',
    ...overrides,
  });
}

test('结构化待处理打手投诉允许创建一次处罚', () => {
  assert.equal(resolveFeedbackPenaltyAttempt(makeFeedback(), null, request), 'create');
});

test('相同处罚请求重试返回幂等结果', () => {
  const feedback = makeFeedback({
    status: FeedbackStatus.Resolved,
    penaltyId: 'penalty-1',
    replyContent: request.replyContent,
  });
  const existing = {
    id: 'penalty-1',
    amountFen: request.amountFen,
    source: request.source,
    reason: request.reason,
  };

  assert.equal(resolveFeedbackPenaltyAttempt(feedback, existing, request), 'idempotent');
});

test('已处罚反馈的不同参数重试被拒绝', () => {
  const feedback = makeFeedback({
    status: FeedbackStatus.Resolved,
    penaltyId: 'penalty-1',
    replyContent: request.replyContent,
  });
  const existing = {
    id: 'penalty-1',
    amountFen: request.amountFen,
    source: request.source,
    reason: request.reason,
  };

  assert.throws(
    () =>
      resolveFeedbackPenaltyAttempt(feedback, existing, {
        ...request,
        amountFen: request.amountFen + 1,
      }),
    /该反馈已按其他参数完成扣款/,
  );
});

test('未关联订单或普通已处理反馈不能扣款', () => {
  assert.throws(
    () =>
      resolveFeedbackPenaltyAttempt(
        makeFeedback({ orderId: '', orderNo: '', boosterUserId: '', boosterName: '' }),
        null,
        request,
      ),
    /反馈未关联可处罚的订单与打手/,
  );
  assert.throws(
    () =>
      resolveFeedbackPenaltyAttempt(
        makeFeedback({ status: FeedbackStatus.Resolved }),
        null,
        request,
      ),
    /反馈已处理，不能再发起扣款/,
  );
});
