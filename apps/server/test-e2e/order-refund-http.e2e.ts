import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Module,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import {
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  OrderRefundStatus,
  OrderStatus,
  PERMS,
} from '@app/contracts';
import type { Request } from 'express';
import { PermissionResolver } from '../src/modules/rbac/application/permission-resolver.service';
import { RoleGranter } from '../src/modules/rbac/application/role-granter.service';
import { SERVICE_ROLE } from '../src/modules/rbac/domain/rbac.constants';
import type { AuthUser } from '../src/modules/rbac/interfaces/auth/metadata';
import { PermissionsGuard } from '../src/modules/rbac/interfaces/auth/permissions.guard';
import { OrderGroupService } from '../src/modules/order/application/order-group.service';
import { ServiceAgentScope } from '../src/modules/order/application/service-agent-scope.service';
import { ApproveOrderRefundUseCase } from '../src/modules/order/application/use-cases/approve-order-refund.usecase';
import { RequestOrderRefundUseCase } from '../src/modules/order/application/use-cases/request-order-refund.usecase';
import {
  ORDER_REFUND_TRANSACTION,
  type OrderRefundTransaction,
} from '../src/modules/order/domain/order-refund-transaction.interface';
import { OrderRefundEntity } from '../src/modules/order/domain/order-refund.entity';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from '../src/modules/order/domain/order-repository.interface';
import { OrderEntity } from '../src/modules/order/domain/order.entity';
import { RefundResolver } from '../src/modules/wallet/application/refund.resolver';
import { OrderAdminRefundApproveController } from '../src/modules/order/interfaces/controllers/order.admin.refund.approve.controller';
import { OrderRefundRequestController } from '../src/modules/order/interfaces/controllers/order.refund.request.controller';

const ADMIN_ORDER_ID = '00000000-0000-4000-8000-000000000601';
const OTHER_AGENT_ORDER_ID = '00000000-0000-4000-8000-000000000602';
const CUSTOMER_ORDER_ID = '00000000-0000-4000-8000-000000000603';
const orders = new Map<string, OrderEntity>();
let baseUrl = '';
let app: Awaited<ReturnType<typeof NestFactory.create>>;
let beginCalls = 0;

@Injectable()
class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const userId = request.header('x-test-user')?.trim();
    if (!userId) {
      throw new UnauthorizedException('未认证');
    }
    request.user = { id: userId, username: userId };
    return true;
  }
}

const permissionResolver = {
  resolve: async (userId: string) => ({
    roles: userId.startsWith('agent-') ? [SERVICE_ROLE] : [],
    permissions: userId.startsWith('agent-') ? [PERMS.order.refundReview] : [],
    isSuper: false,
  }),
};

const roleGranter = {
  has: async (userId: string, roleCode: string) =>
    roleCode === SERVICE_ROLE && userId.startsWith('agent-'),
};

const orderRepository = {
  findById: async (id: string) => orders.get(id) ?? null,
} as OrderRepository;

const refundTransaction: OrderRefundTransaction = {
  request: async (input) => {
    const order = orders.get(input.orderId);
    if (!order || order.tenantId !== input.tenantId || order.userId !== input.userId) {
      return { outcome: 'not_found' };
    }
    if (order.refund) {
      return { outcome: 'already_requested' };
    }
    const refund = makeRefund(order, input.refundNo, input.reason);
    order.refund = refund;
    order.status = OrderStatus.RefundReviewing;
    return { outcome: 'created', order, refund };
  },
  begin: async (input) => {
    beginCalls += 1;
    const order = orders.get(input.orderId);
    if (!order || order.tenantId !== input.tenantId || !order.refund) {
      return { outcome: 'not_found' };
    }
    order.refund.status = OrderRefundStatus.Processing;
    order.refund.reviewerId = input.reviewerId;
    order.refund.reviewedAt = new Date();
    return { outcome: 'started', order, refund: order.refund };
  },
  recordChannelResult: async () => ({ outcome: 'not_found' }),
  complete: async (input) => {
    const order = [...orders.values()].find((item) => item.refund?.id === input.refundId);
    if (!order?.refund || order.tenantId !== input.tenantId) {
      return { outcome: 'not_found' };
    }
    order.status = OrderStatus.Refunded;
    order.refund.status = OrderRefundStatus.Succeeded;
    order.refund.providerRefundNo = input.providerRefundNo;
    order.refund.refundedAt = new Date();
    return { outcome: 'completed', order, refund: order.refund };
  },
  fail: async () => null,
  reject: async () => ({ outcome: 'not_found' }),
};

@Module({
  controllers: [OrderAdminRefundApproveController, OrderRefundRequestController],
  providers: [
    ApproveOrderRefundUseCase,
    RequestOrderRefundUseCase,
    ServiceAgentScope,
    { provide: ORDER_REPOSITORY, useValue: orderRepository },
    { provide: ORDER_REFUND_TRANSACTION, useValue: refundTransaction },
    { provide: RefundResolver, useValue: { resolve: () => undefined } },
    { provide: RoleGranter, useValue: roleGranter },
    { provide: PermissionResolver, useValue: permissionResolver },
    { provide: OrderGroupService, useValue: { syncTitle: async () => undefined } },
    { provide: APP_GUARD, useClass: HeaderAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
class RefundHttpTestModule {}

before(async () => {
  orders.set(
    ADMIN_ORDER_ID,
    makeOrder(ADMIN_ORDER_ID, 'customer-a', 'agent-own', OrderStatus.RefundReviewing, true),
  );
  orders.set(
    OTHER_AGENT_ORDER_ID,
    makeOrder(OTHER_AGENT_ORDER_ID, 'customer-b', 'agent-other', OrderStatus.RefundReviewing, true),
  );
  orders.set(
    CUSTOMER_ORDER_ID,
    makeOrder(CUSTOMER_ORDER_ID, 'customer-owner', 'agent-own', OrderStatus.PendingService, false),
  );
  app = await NestFactory.create(RefundHttpTestModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  await app?.close();
});

test('退款审核 HTTP 守卫拒绝未登录和未授权用户', async () => {
  const anonymous = await post(`/order/admin/${ADMIN_ORDER_ID}/refund/approve`);
  assert.equal(anonymous.status, 401);

  const beforeCalls = beginCalls;
  const denied = await post(`/order/admin/${ADMIN_ORDER_ID}/refund/approve`, 'viewer');
  assert.equal(denied.status, 403);
  assert.equal(beginCalls, beforeCalls);
});

test('已授权客服仍不能通过 HTTP 审核其他客服负责的订单', async () => {
  const response = await post(`/order/admin/${OTHER_AGENT_ORDER_ID}/refund/approve`, 'agent-own');

  assert.equal(response.status, 403);
  assert.equal(orders.get(OTHER_AGENT_ORDER_ID)?.status, OrderStatus.RefundReviewing);
});

test('已授权客服可通过 HTTP 审核自己负责的余额订单', async () => {
  const response = await post(`/order/admin/${ADMIN_ORDER_ID}/refund/approve`, 'agent-own');

  assert.equal(response.status, 201);
  assert.equal(orders.get(ADMIN_ORDER_ID)?.status, OrderStatus.Refunded);
  assert.equal(orders.get(ADMIN_ORDER_ID)?.refund?.status, OrderRefundStatus.Succeeded);
});

test('用户退款申请 HTTP 接口隐藏他人订单并允许订单本人申请', async () => {
  const denied = await post(`/order/${CUSTOMER_ORDER_ID}/refund`, 'customer-other', {
    reason: '不是本人订单',
  });
  assert.equal(denied.status, 404);

  const allowed = await post(`/order/${CUSTOMER_ORDER_ID}/refund`, 'customer-owner', {
    reason: '临时无法继续服务',
  });
  assert.equal(allowed.status, 201);
  assert.equal(orders.get(CUSTOMER_ORDER_ID)?.status, OrderStatus.RefundReviewing);
});

function post(path: string, userId?: string, body?: Record<string, unknown>): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      ...(userId ? { 'x-test-user': userId } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function makeOrder(
  id: string,
  userId: string,
  serviceAgentId: string,
  status: OrderStatus,
  withRefund: boolean,
): OrderEntity {
  const now = new Date('2026-07-22T00:00:00.000Z');
  const order: OrderEntity = Object.assign(new OrderEntity(), {
    id,
    tenantId: 'tenant-http-e2e',
    userId,
    orderNo: `ORDER-${id.slice(-3)}`,
    productId: 'product-http-e2e',
    productTitle: '退款 HTTP E2E 商品',
    productCover: '',
    serviceAgentId,
    boosterId: '',
    boosterName: '',
    requestedBoosterId: '',
    requestedBoosterName: '',
    boosterSelectionMode: OrderBoosterSelectionMode.Auto,
    conversationId: '',
    quantity: 1,
    amountFen: 500,
    originalAmountFen: 500,
    discountBp: 10_000,
    userCouponId: null,
    couponDeductionFen: 0,
    commissionFen: 0,
    commissionRateBp: 0,
    provider: OrderPaymentMethod.Balance,
    providerTradeNo: 'BALANCE-HTTP-E2E',
    status,
    remark: '',
    remarkMedia: [],
    accountInfo: '',
    gameAccountId: '',
    gameTextId: '',
    serviceRegion: '',
    memberSpendRecorded: true,
    refund: null,
    createdAt: now,
    updatedAt: now,
    paidAt: now,
    dispatchedAt: null,
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
  });
  if (withRefund) {
    order.refund = makeRefund(order, `REFUND-${id.slice(-3)}`, '用户申请退款');
  }
  return order;
}

function makeRefund(order: OrderEntity, refundNo: string, reason: string): OrderRefundEntity {
  const now = new Date('2026-07-22T00:01:00.000Z');
  return Object.assign(new OrderRefundEntity(), {
    id: `10000000-0000-4000-8000-000000000${order.id.slice(-3)}`,
    tenantId: order.tenantId,
    orderId: order.id,
    userId: order.userId,
    refundNo,
    channelRefundNo: '',
    attempt: 0,
    amountFen: order.amountFen,
    paymentMethod: order.provider,
    sourceOrderStatus: OrderStatus.PendingService,
    reason,
    status: OrderRefundStatus.PendingReview,
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
