import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOSTER_LEVEL_DEFAULTS,
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  OrderRefundStatus,
  OrderStatus,
} from '@app/contracts';
import {
  toAdminOrderView,
  toBoosterOrderView,
  toHallOrderView,
  toOwnerOrderView,
} from '../../src/modules/order/application/order.mapper';
import type { BoosterProgressService } from '../../src/modules/booster/application/booster-progress.service';
import type { BoosterAccess } from '../../src/modules/order/application/booster-access.service';
import { GetHallOrderUseCase } from '../../src/modules/order/application/use-cases/get-hall-order.usecase';
import { OrderRefundEntity } from '../../src/modules/order/domain/order-refund.entity';
import type { OrderRepository } from '../../src/modules/order/domain/order-repository.interface';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';

test('订单本人退款投影不泄露内部标识，管理端保留审核字段', () => {
  const order = makeRejectedDispatchingOrder();

  const ownerView = toOwnerOrderView(order);
  const adminView = toAdminOrderView(order);

  assert.ok(ownerView.refund);
  assert.equal(Object.prototype.hasOwnProperty.call(ownerView.refund, 'id'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(ownerView.refund, 'refundNo'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(ownerView.refund, 'reviewerId'), false);
  assert.equal(ownerView.refund.rejectReason, '已协商继续履约');
  assert.equal(adminView.refund?.id, order.refund?.id);
  assert.equal(adminView.refund?.refundNo, order.refund?.refundNo);
  assert.equal(adminView.refund?.reviewerId, order.refund?.reviewerId);
});

test('驳回后恢复待接单的订单在大厅和打手投影中隐藏全部退款信息', async () => {
  const order = makeRejectedDispatchingOrder();
  const repository = {
    findById: async () => order,
  } as unknown as OrderRepository;
  const access = {
    assert: async () => undefined,
  } as unknown as BoosterAccess;
  const progress = {
    currentTier: async () => BOOSTER_LEVEL_DEFAULTS[0],
  } as unknown as BoosterProgressService;
  const hallUseCase = new GetHallOrderUseCase(repository, access, progress);

  const hallView = await hallUseCase.execute('booster-1', order.id);
  const boosterView = toBoosterOrderView(order);

  assert.equal(hallView.status, OrderStatus.Dispatching);
  assert.equal(hallView.refund, null);
  assert.equal(hallView.canRequestRefund, false);
  assert.equal(hallView.accountInfo, '');
  assert.equal(boosterView.refund, null);
  assert.equal(boosterView.canRequestRefund, false);
  assert.equal(boosterView.accountInfo, order.accountInfo);
  assert.equal(hallView.commissionRateBp, BOOSTER_LEVEL_DEFAULTS[0].commissionRateBp);
  assert.deepEqual(
    toHallOrderView(order, BOOSTER_LEVEL_DEFAULTS[0].commissionRateBp),
    hallView,
  );
});

function makeRejectedDispatchingOrder(): OrderEntity {
  const requestedAt = new Date('2026-07-22T00:01:00.000Z');
  const reviewedAt = new Date('2026-07-22T00:02:00.000Z');
  const order: OrderEntity = Object.assign(new OrderEntity(), {
    id: '00000000-0000-4000-8000-000000000201',
    tenantId: 'tenant-1',
    userId: 'owner-1',
    orderNo: 'O20260722000000999999',
    productId: 'product-1',
    productTitle: '陪玩服务',
    productCover: '',
    serviceAgentId: 'agent-1',
    quantity: 1,
    amountFen: 500,
    originalAmountFen: 500,
    discountBp: 10_000,
    couponDeductionFen: 0,
    commissionFen: 0,
    commissionRateBp: 0,
    provider: OrderPaymentMethod.Balance,
    providerTradeNo: 'BALANCE-order-1',
    status: OrderStatus.Dispatching,
    remark: '',
    remarkMedia: [],
    accountInfo: 'sensitive-account',
    gameAccountId: '123456',
    gameTextId: 'text-id',
    serviceRegion: 'delta-mobile',
    boosterSelectionMode: OrderBoosterSelectionMode.Auto,
    requestedBoosterId: '',
    requestedBoosterName: '',
    boosterId: 'booster-1',
    boosterName: '打手一号',
    conversationId: 'conversation-1',
    createdAt: new Date('2026-07-22T00:00:00.000Z'),
    updatedAt: reviewedAt,
    paidAt: new Date('2026-07-22T00:00:30.000Z'),
    dispatchedAt: new Date('2026-07-22T00:00:40.000Z'),
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
    refund: null,
  });
  order.refund = Object.assign(new OrderRefundEntity(), {
    id: '00000000-0000-4000-8000-000000000202',
    tenantId: order.tenantId,
    orderId: order.id,
    userId: order.userId,
    refundNo: 'R20260722000000999999',
    amountFen: order.amountFen,
    paymentMethod: order.provider,
    sourceOrderStatus: OrderStatus.Dispatching,
    reason: '临时无法继续服务',
    status: OrderRefundStatus.Rejected,
    providerRefundNo: '',
    reviewerId: 'reviewer-1',
    reviewedAt,
    rejectReason: '已协商继续履约',
    failReason: '',
    refundedAt: null,
    createdAt: requestedAt,
    updatedAt: reviewedAt,
  });
  return order;
}
