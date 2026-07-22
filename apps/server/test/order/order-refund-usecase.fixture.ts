import {
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  OrderRefundStatus,
  OrderStatus,
  PaymentProvider,
} from '@app/contracts';
import type { RefundResolver } from '../../src/modules/wallet/application/refund.resolver';
import type { RefundPort } from '../../src/modules/wallet/domain/refund-port.interface';
import type { OrderGroupService } from '../../src/modules/order/application/order-group.service';
import type { ServiceAgentScope } from '../../src/modules/order/application/service-agent-scope.service';
import { ApproveOrderRefundUseCase } from '../../src/modules/order/application/use-cases/approve-order-refund.usecase';
import type { OrderRefundTransaction } from '../../src/modules/order/domain/order-refund-transaction.interface';
import { OrderRefundEntity } from '../../src/modules/order/domain/order-refund.entity';
import type { OrderRepository } from '../../src/modules/order/domain/order-repository.interface';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';

export function makeOrder(
  status: OrderStatus = OrderStatus.PendingService,
  paymentMethod: OrderPaymentMethod = OrderPaymentMethod.Balance,
): OrderEntity {
  const now = new Date('2026-07-22T00:00:00.000Z');
  return Object.assign(new OrderEntity(), {
    id: '00000000-0000-4000-8000-000000000101',
    tenantId: 'tenant-1',
    userId: 'user-1',
    orderNo: 'O20260722000000123456',
    productId: 'product-1',
    productTitle: '陪玩服务',
    productCover: '',
    serviceAgentId: 'agent-1',
    boosterId: '',
    boosterName: '',
    requestedBoosterId: '',
    requestedBoosterName: '',
    boosterSelectionMode: OrderBoosterSelectionMode.Auto,
    conversationId: 'conversation-1',
    quantity: 1,
    amountFen: 500,
    originalAmountFen: 500,
    discountBp: 10_000,
    userCouponId: null,
    couponDeductionFen: 0,
    commissionFen: 0,
    commissionRateBp: 0,
    provider: paymentMethod,
    providerTradeNo: 'provider-trade-1',
    status,
    remark: '',
    remarkMedia: [],
    accountInfo: '',
    gameAccountId: '',
    gameTextId: '',
    serviceRegion: '',
    refund: null,
    createdAt: now,
    updatedAt: now,
    paidAt: now,
    dispatchedAt: null,
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
  });
}

export function makeRefund(order: OrderEntity, status: OrderRefundStatus): OrderRefundEntity {
  const now = new Date('2026-07-22T00:01:00.000Z');
  return Object.assign(new OrderRefundEntity(), {
    id: '00000000-0000-4000-8000-000000000102',
    tenantId: order.tenantId,
    orderId: order.id,
    userId: order.userId,
    refundNo: 'R20260722000000123456',
    channelRefundNo: '',
    attempt: 0,
    amountFen: order.amountFen,
    paymentMethod: order.provider,
    sourceOrderStatus: OrderStatus.PendingService,
    reason: '临时无法继续服务',
    status,
    providerRefundNo: '',
    reviewerId: '',
    reviewedAt: null,
    rejectReason: '',
    failReason: '',
    refundedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

export type ReviewingOrder = OrderEntity & { refund: OrderRefundEntity };

export function makeReviewingOrder(paymentMethod: OrderPaymentMethod): ReviewingOrder {
  const order = makeOrder(OrderStatus.RefundReviewing, paymentMethod);
  return Object.assign(order, {
    refund: makeRefund(order, OrderRefundStatus.PendingReview),
  });
}

export function repositoryFor(order: OrderEntity): OrderRepository {
  return { findById: async (id: string) => (id === order.id ? order : null) } as OrderRepository;
}

export function scopeAllowing(): ServiceAgentScope {
  return { assertCanHandle: async () => undefined } as unknown as ServiceAgentScope;
}

export function transactionHarness(
  order: ReviewingOrder,
  hooks: { complete?: (providerRefundNo: string) => Promise<void> } = {},
): OrderRefundTransaction {
  return {
    request: async () => ({ outcome: 'invalid_status' }),
    begin: async (input) => {
      if (
        order.refund.status === OrderRefundStatus.Succeeded &&
        order.status === OrderStatus.Refunded
      ) {
        return { outcome: 'already_succeeded', order, refund: order.refund };
      }
      const retrying = order.refund.status === OrderRefundStatus.Failed;
      order.refund.status = OrderRefundStatus.Processing;
      if (order.refund.paymentMethod !== OrderPaymentMethod.Balance && order.refund.amountFen > 0) {
        order.refund.channelRefundNo = input.channelRefundNo;
        order.refund.attempt += 1;
      }
      return {
        outcome: retrying ? ('retry_started' as const) : ('started' as const),
        order,
        refund: order.refund,
      };
    },
    recordChannelResult: async (input) => {
      order.refund.providerRefundNo = input.providerRefundNo;
      return { outcome: 'recorded', order, refund: order.refund };
    },
    complete: async (input) => {
      await hooks.complete?.(input.providerRefundNo);
      order.status = OrderStatus.Refunded;
      order.refund.status = OrderRefundStatus.Succeeded;
      order.refund.providerRefundNo = input.providerRefundNo;
      order.refund.refundedAt = new Date();
      return { outcome: 'completed', order, refund: order.refund };
    },
    fail: async (input) => {
      order.refund.status = OrderRefundStatus.Failed;
      order.refund.providerRefundNo = input.providerRefundNo;
      order.refund.failReason = input.reason;
      return { order, refund: order.refund };
    },
    reject: async (input) => {
      order.status = order.refund.sourceOrderStatus;
      order.refund.status = OrderRefundStatus.Rejected;
      order.refund.rejectReason = input.reason;
      return { outcome: 'rejected', order, refund: order.refund };
    },
  };
}

export function approveUseCase(
  order: ReviewingOrder,
  transactions: OrderRefundTransaction,
  resolver: RefundResolver,
): ApproveOrderRefundUseCase {
  return new ApproveOrderRefundUseCase(
    repositoryFor(order),
    transactions,
    resolver,
    scopeAllowing(),
    { syncTitle: async () => undefined } as unknown as OrderGroupService,
  );
}

export function resolverFor(port: RefundPort): RefundResolver {
  return { resolve: () => port } as unknown as RefundResolver;
}

export function refundPort(
  result?: Awaited<ReturnType<RefundPort['createRefund']>>,
  error?: Error,
  readyError?: Error,
  provider: PaymentProvider = PaymentProvider.Alipay,
): RefundPort {
  return {
    provider,
    assertReady: async () => {
      if (readyError) {
        throw readyError;
      }
    },
    createRefund: async () => {
      if (error) {
        throw error;
      }
      if (!result) {
        throw new Error('测试未设置渠道结果');
      }
      return result;
    },
    queryRefund: async () => {
      if (!result) {
        throw new Error('测试未设置渠道结果');
      }
      return result;
    },
  };
}
