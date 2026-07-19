import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, Logger } from '@nestjs/common';
import {
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  OrderStatus,
  ProductStatus,
} from '@app/contracts';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ProductRepository } from '../../src/modules/commerce/domain/product-repository.interface';
import { ProductEntity } from '../../src/modules/commerce/domain/product.entity';
import type { ConfigService } from '../../src/modules/config/application/config.service';
import type { CouponRedeemService } from '../../src/modules/coupon/application/coupon-redeem.service';
import type { MemberLevelService } from '../../src/modules/member/application/member-level.service';
import type { MemberProgressService } from '../../src/modules/member/application/member-progress.service';
import type { OrderGroupService } from '../../src/modules/order/application/order-group.service';
import type { BoosterSelectionService } from '../../src/modules/booster/application/booster-selection.service';
import { OrderPaymentSettleService } from '../../src/modules/order/application/order-payment.service';
import { CreateOrderUseCase } from '../../src/modules/order/application/use-cases/create-order.usecase';
import type { OrderPaymentSettlement } from '../../src/modules/order/domain/order-payment-settlement.interface';
import type { OrderRepository } from '../../src/modules/order/domain/order-repository.interface';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';
import { CreateOrderDto } from '../../src/modules/order/interfaces/dto/create-order.dto';
import type { PaymentResolver } from '../../src/modules/wallet/application/payment.resolver';
import type { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

interface FailureFixture {
  useCase: CreateOrderUseCase;
  currentOrder: () => OrderEntity | null;
  restoredOrderIds: string[];
  resolvedPaymentChannels: string[];
}

function createFailureFixture(balanceFailure: Error, channelFailure: Error): FailureFixture {
  let storedOrder: OrderEntity | null = null;
  const restoredOrderIds: string[] = [];
  const resolvedPaymentChannels: string[] = [];
  const product = Object.assign(new ProductEntity(), {
    id: 'product-1',
    status: ProductStatus.OnShelf,
    title: '陪玩服务',
    cover: '',
    serviceAgentId: '',
    priceFen: 500,
  });
  const orders = {
    create: (data: Partial<OrderEntity>) =>
      Object.assign(new OrderEntity(), {
        id: '',
        tenantId: 'tenant-1',
        cancelledAt: null,
        ...data,
      }),
    save: async (order: OrderEntity) => {
      if (!order.id) {
        order.id = 'order-1';
      }
      storedOrder = order;
      return order;
    },
    findById: async (id: string) => (storedOrder?.id === id ? storedOrder : null),
  } as unknown as OrderRepository;
  const products = {
    findById: async (id: string) => (id === product.id ? product : null),
  } as unknown as ProductRepository;
  const paymentResolver = {
    resolve: (provider: string) => {
      resolvedPaymentChannels.push(provider);
      return {
        createRecharge: async () => {
          throw channelFailure;
        },
      };
    },
  } as unknown as PaymentResolver;
  const config = {
    getString: async () => 'https://pay.example.test',
  } as unknown as ConfigService;
  const memberLevels = {
    resolveForUser: async () => ({
      level: 1,
      name: '普通会员',
      minSpendFen: 0,
      discountBp: 10_000,
    }),
  } as unknown as MemberLevelService;
  const couponRedeem = {
    resolveDeduction: async () => 100,
    redeem: async () => undefined,
    restoreByOrder: async (orderId: string) => {
      restoredOrderIds.push(orderId);
    },
  } as unknown as CouponRedeemService;
  const settle = {
    payWithBalance: async () => {
      throw balanceFailure;
    },
  } as unknown as OrderPaymentSettleService;
  const boosterSelection = {
    assertSelectable: async (_ownerId: string, requestedUserId: string) => ({
      userId: requestedUserId,
      displayName: '指定打手',
    }),
  } as unknown as BoosterSelectionService;

  return {
    useCase: new CreateOrderUseCase(
      orders,
      products,
      paymentResolver,
      config,
      memberLevels,
      couponRedeem,
      settle,
      boosterSelection,
    ),
    currentOrder: () => storedOrder,
    restoredOrderIds,
    resolvedPaymentChannels,
  };
}

test('创建余额订单遇到冻结或不足时取消订单并回退优惠券', async () => {
  const failure = new BadRequestException('钱包余额不足');
  const fixture = createFailureFixture(failure, new Error('unused'));

  await assert.rejects(
    fixture.useCase.execute('user-1', {
      productId: 'product-1',
      quantity: 1,
      provider: OrderPaymentMethod.Balance,
      gameAccountId: '123456',
      serviceRegion: 'delta-mobile',
      boosterSelectionMode: OrderBoosterSelectionMode.Auto,
      userCouponId: 'coupon-1',
    }),
    /钱包余额不足/,
  );

  assert.equal(fixture.currentOrder()?.status, OrderStatus.Cancelled);
  assert.ok(fixture.currentOrder()?.cancelledAt instanceof Date);
  assert.deepEqual(fixture.restoredOrderIds, ['order-1']);
  assert.deepEqual(fixture.resolvedPaymentChannels, []);
});

test('扫码渠道建单失败同样取消新订单并回退优惠券', async () => {
  const failure = new Error('渠道暂不可用');
  const fixture = createFailureFixture(new Error('unused'), failure);

  await assert.rejects(
    fixture.useCase.execute('user-1', {
      productId: 'product-1',
      quantity: 1,
      provider: OrderPaymentMethod.Alipay,
      gameAccountId: '123456',
      serviceRegion: 'delta-mobile',
      boosterSelectionMode: OrderBoosterSelectionMode.Auto,
      userCouponId: 'coupon-1',
    }),
    /渠道暂不可用/,
  );

  assert.equal(fixture.currentOrder()?.status, OrderStatus.Cancelled);
  assert.deepEqual(fixture.restoredOrderIds, ['order-1']);
  assert.deepEqual(fixture.resolvedPaymentChannels, ['alipay']);
});

test('指定打手仅固化请求快照，不提前写入实际接单打手', async () => {
  const fixture = createFailureFixture(
    new BadRequestException('钱包余额不足'),
    new Error('unused'),
  );
  const requestedBoosterId = '11111111-1111-4111-8111-111111111111';

  await assert.rejects(
    fixture.useCase.execute('user-1', {
      productId: 'product-1',
      quantity: 1,
      provider: OrderPaymentMethod.Balance,
      gameAccountId: '123456',
      gameTextId: 'text-id',
      serviceRegion: 'delta-mobile',
      boosterSelectionMode: OrderBoosterSelectionMode.Specified,
      requestedBoosterId,
    }),
    /钱包余额不足/,
  );

  assert.equal(fixture.currentOrder()?.requestedBoosterId, requestedBoosterId);
  assert.equal(fixture.currentOrder()?.requestedBoosterName, '指定打手');
  assert.notEqual(fixture.currentOrder()?.boosterId, requestedBoosterId);
});

test('余额支付 DTO 接受 balance 且拒绝未知支付方式', async () => {
  const valid = plainToInstance(CreateOrderDto, {
    productId: 'product-1',
    quantity: 1,
    provider: OrderPaymentMethod.Balance,
    gameAccountId: '123456',
    serviceRegion: 'delta-mobile',
    boosterSelectionMode: OrderBoosterSelectionMode.Auto,
  });
  const invalid = plainToInstance(CreateOrderDto, {
    productId: 'product-1',
    quantity: 1,
    provider: 'cash',
    gameAccountId: '123456',
    serviceRegion: 'delta-mobile',
    boosterSelectionMode: OrderBoosterSelectionMode.Auto,
  });

  assert.equal((await validate(valid)).length, 0);
  assert.ok((await validate(invalid)).some((error) => error.property === 'provider'));
});

test('支付事务提交后的会员累计失败不会冒泡为支付失败', async (t) => {
  t.mock.method(Logger.prototype, 'error', () => undefined);
  const order = Object.assign(new OrderEntity(), {
    id: 'order-1',
    tenantId: 'tenant-1',
    orderNo: 'ORDER-1',
    userId: 'user-1',
  });
  const settlement = {
    settleBalance: async () => order,
  } as unknown as OrderPaymentSettlement;
  const memberProgress = {
    recordSpend: async () => {
      throw new Error('会员服务暂不可用');
    },
  };
  let groupCalled = false;
  let tenantId = '';
  let isSuper = true;
  const orderGroup = {
    ensureGroup: async () => {
      groupCalled = true;
    },
  };
  const tenant = {
    run: <T>(context: { tenantId: string | null; isSuper: boolean }, callback: () => T): T => {
      tenantId = context.tenantId ?? '';
      isSuper = context.isSuper;
      return callback();
    },
  };
  const service = new OrderPaymentSettleService(
    settlement,
    memberProgress as unknown as MemberProgressService,
    orderGroup as unknown as OrderGroupService,
    tenant as unknown as TenantContextService,
  );

  await assert.doesNotReject(service.payWithBalance(order.id, order.userId, 300));
  assert.equal(groupCalled, true);
  assert.equal(tenantId, order.tenantId);
  assert.equal(isSuper, false);
});
