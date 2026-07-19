import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderBoosterSelectionMode, OrderPaymentMethod, OrderStatus } from '@app/contracts';
import { ConflictException } from '@nestjs/common';
import type { BoosterSelectionService } from '../../src/modules/booster/application/booster-selection.service';
import type { TenantContextService } from '../../src/shared/tenant/tenant-context.service';
import type { BoosterAccess } from '../../src/modules/order/application/booster-access.service';
import type { OrderGroupService } from '../../src/modules/order/application/order-group.service';
import type { ServiceAgentScope } from '../../src/modules/order/application/service-agent-scope.service';
import { AcceptHallOrderUseCase } from '../../src/modules/order/application/use-cases/accept-hall-order.usecase';
import { AssignOrderBoosterUseCase } from '../../src/modules/order/application/use-cases/assign-order-booster.usecase';
import type {
  ClaimOrderForServingInput,
  OrderRepository,
} from '../../src/modules/order/domain/order-repository.interface';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';

function createDispatchingOrder(): OrderEntity {
  return Object.assign(new OrderEntity(), {
    id: 'order-1',
    tenantId: 'tenant-1',
    userId: 'owner-1',
    orderNo: 'ORDER-1',
    productId: 'product-1',
    productTitle: '陪玩服务',
    productCover: '',
    serviceAgentId: 'agent-1',
    quantity: 1,
    amountFen: 100,
    originalAmountFen: 100,
    discountBp: 10_000,
    userCouponId: null,
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
    boosterId: '',
    boosterName: '',
    conversationId: 'conversation-1',
    createdAt: new Date('2026-07-19T00:00:00.000Z'),
    updatedAt: new Date('2026-07-19T00:00:00.000Z'),
    paidAt: new Date('2026-07-19T00:01:00.000Z'),
    dispatchedAt: new Date('2026-07-19T00:02:00.000Z'),
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
  });
}

test('并发接单只有原子领取成功者获得订单并进入群聊', async () => {
  const order = createDispatchingOrder();
  let claimed = false;
  let joined = 0;
  const orders = {
    findById: async () => order,
    claimForServing: async (input: ClaimOrderForServingInput) => {
      await Promise.resolve();
      if (claimed) {
        return null;
      }
      claimed = true;
      return Object.assign(new OrderEntity(), order, {
        status: OrderStatus.Serving,
        boosterId: input.boosterId,
        boosterName: input.boosterName,
        acceptedAt: input.acceptedAt,
      });
    },
  } as unknown as OrderRepository;
  const access = {
    assert: async () => undefined,
  } as unknown as BoosterAccess;
  const selection = {
    assertSelectable: async (_ownerId: string, boosterId: string) => ({
      userId: boosterId,
      displayName: `打手-${boosterId}`,
    }),
  } as unknown as BoosterSelectionService;
  const groups = {
    joinBooster: async () => {
      joined += 1;
    },
  } as unknown as OrderGroupService;
  const useCase = new AcceptHallOrderUseCase(orders, access, selection, groups);

  const results = await Promise.allSettled([
    useCase.execute('booster-1', order.id),
    useCase.execute('booster-2', order.id),
  ]);
  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(joined, 1);
  assert.equal(
    fulfilled[0]?.status === 'fulfilled' && fulfilled[0].value.accountInfo,
    'sensitive-account',
  );
  assert.ok(rejected[0]?.status === 'rejected' && rejected[0].reason instanceof ConflictException);
});

test('后台原子指派竞争失败时不拉打手进群', async () => {
  const order = createDispatchingOrder();
  let joined = 0;
  let tenantId = '';
  const orders = {
    findById: async () => order,
    claimForServing: async () => null,
  } as unknown as OrderRepository;
  const scope = {
    assertCanHandle: async () => undefined,
  } as unknown as ServiceAgentScope;
  const selection = {
    assertSelectable: async (_ownerId: string, boosterId: string) => ({
      userId: boosterId,
      displayName: '指定打手',
    }),
  } as unknown as BoosterSelectionService;
  const groups = {
    joinBooster: async () => {
      joined += 1;
    },
  } as unknown as OrderGroupService;
  const tenant = {
    run: <T>(context: { tenantId: string | null }, callback: () => T): T => {
      tenantId = context.tenantId ?? '';
      return callback();
    },
  } as unknown as TenantContextService;
  const useCase = new AssignOrderBoosterUseCase(orders, scope, selection, groups, tenant);

  await assert.rejects(
    useCase.execute('agent-1', order.id, 'booster-1'),
    (error: unknown) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(tenantId, order.tenantId);
  assert.equal(joined, 0);
});
