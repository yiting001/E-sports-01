import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderRefundStatus, OrderStatus } from '@app/contracts';
import {
  canApproveOrderRefund,
  canRejectOrderRefund,
  canRequestOrderRefund,
} from '../../src/modules/order/domain/order-refund.rules';

test('仅已付款且未开工订单可申请退款', () => {
  assert.equal(canRequestOrderRefund(OrderStatus.PendingService), true);
  assert.equal(canRequestOrderRefund(OrderStatus.Dispatching), true);
  assert.equal(canRequestOrderRefund(OrderStatus.PendingPayment), false);
  assert.equal(canRequestOrderRefund(OrderStatus.Serving), false);
  assert.equal(canRequestOrderRefund(OrderStatus.Completed), false);
  assert.equal(canRequestOrderRefund(OrderStatus.RefundReviewing), false);
  assert.equal(canRequestOrderRefund(OrderStatus.Refunded), false);
  assert.equal(canRequestOrderRefund(OrderStatus.Cancelled), false);
});

test('退款审核状态只允许合法操作', () => {
  assert.equal(canApproveOrderRefund(OrderRefundStatus.PendingReview), true);
  assert.equal(canApproveOrderRefund(OrderRefundStatus.Processing), true);
  assert.equal(canApproveOrderRefund(OrderRefundStatus.Failed), true);
  assert.equal(canApproveOrderRefund(OrderRefundStatus.Rejected), false);
  assert.equal(canApproveOrderRefund(OrderRefundStatus.Succeeded), false);
  assert.equal(canRejectOrderRefund(OrderRefundStatus.PendingReview), true);
  assert.equal(canRejectOrderRefund(OrderRefundStatus.Processing), false);
  assert.equal(canRejectOrderRefund(OrderRefundStatus.Failed), false);
});
