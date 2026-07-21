import assert from 'node:assert/strict';
import test from 'node:test';
import { FeedbackType, OrderPaymentMethod, OrderStatus } from '@app/contracts';
import { resolveFeedbackOrderSnapshot } from '../../src/modules/feedback/application/feedback-order-snapshot';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';

function makeOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
  return Object.assign(new OrderEntity(), {
    id: 'order-1',
    tenantId: 'tenant-1',
    userId: 'owner-1',
    orderNo: 'O-20260721-1',
    boosterId: 'booster-1',
    boosterName: '打手甲',
    provider: OrderPaymentMethod.Balance,
    status: OrderStatus.Serving,
    ...overrides,
  });
}

test('投诉打手从本人服务订单生成可信订单与打手快照', () => {
  const snapshot = resolveFeedbackOrderSnapshot({
    userId: 'owner-1',
    type: FeedbackType.Booster,
    orderId: 'order-1',
    order: makeOrder(),
  });

  assert.deepEqual(snapshot, {
    orderId: 'order-1',
    orderNo: 'O-20260721-1',
    boosterUserId: 'booster-1',
    boosterName: '打手甲',
    target: 'O-20260721-1',
  });
});

test('投诉打手拒绝缺少订单、越权订单和未产生实际打手的订单', () => {
  assert.throws(
    () =>
      resolveFeedbackOrderSnapshot({
        userId: 'owner-1',
        type: FeedbackType.Booster,
        orderId: undefined,
        order: null,
      }),
    /投诉打手必须选择关联订单/,
  );
  assert.throws(
    () =>
      resolveFeedbackOrderSnapshot({
        userId: 'owner-2',
        type: FeedbackType.Booster,
        orderId: 'order-1',
        order: makeOrder(),
      }),
    /关联订单不存在/,
  );
  assert.throws(
    () =>
      resolveFeedbackOrderSnapshot({
        userId: 'owner-1',
        type: FeedbackType.Booster,
        orderId: 'order-1',
        order: makeOrder({
          status: OrderStatus.PendingService,
          boosterId: '',
          boosterName: '',
        }),
      }),
    /订单尚未产生实际接单打手/,
  );
});

test('非打手反馈拒绝夹带订单关联', () => {
  assert.throws(
    () =>
      resolveFeedbackOrderSnapshot({
        userId: 'owner-1',
        type: FeedbackType.Other,
        orderId: 'order-1',
        order: makeOrder(),
      }),
    /仅投诉打手可以关联订单/,
  );
});
