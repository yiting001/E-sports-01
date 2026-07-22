import assert from 'node:assert/strict';
import test from 'node:test';
import { Logger } from '@nestjs/common';
import {
  ConversationType,
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  OrderStatus,
} from '@app/contracts';
import type { BoosterProgressService } from '../../src/modules/booster/application/booster-progress.service';
import type { ConversationNotifier } from '../../src/modules/im/application/conversation-notifier.service';
import {
  GroupFacade,
  SystemGroupTitleSyncResult,
} from '../../src/modules/im/application/group-facade.service';
import type { SystemMessageService } from '../../src/modules/im/application/system-message.service';
import type { ConversationMemberRepository } from '../../src/modules/im/domain/conversation-member-repository.interface';
import type { ConversationRepository } from '../../src/modules/im/domain/conversation-repository.interface';
import { ConversationEntity } from '../../src/modules/im/domain/conversation.entity';
import type { UserDirectory } from '../../src/modules/rbac/application/user-directory.service';
import { OrderGroupService } from '../../src/modules/order/application/order-group.service';
import {
  buildOrderGroupTitle,
  ORDER_GROUP_TITLE_MAX_LENGTH,
} from '../../src/modules/order/application/order-group-title';
import type { ServiceAgentScope } from '../../src/modules/order/application/service-agent-scope.service';
import type { BoosterAccess } from '../../src/modules/order/application/booster-access.service';
import { CompleteBoosterOrderUseCase } from '../../src/modules/order/application/use-cases/complete-booster-order.usecase';
import { DispatchOrderUseCase } from '../../src/modules/order/application/use-cases/dispatch-order.usecase';
import type { OrderRepository } from '../../src/modules/order/domain/order-repository.interface';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';
import type { WalletService } from '../../src/modules/wallet/application/wallet.service';
import type { WalletLedger } from '../../src/modules/wallet/domain/ledger.interface';

test('订单群标题映射履约与退款阶段，并限制为 128 个字符', () => {
  assert.equal(
    buildOrderGroupTitle('陪玩服务', OrderStatus.PendingService),
    '[待接单] 订单群·陪玩服务',
  );
  assert.equal(
    buildOrderGroupTitle('陪玩服务', OrderStatus.Dispatching),
    '[待接单] 订单群·陪玩服务',
  );
  assert.equal(buildOrderGroupTitle('陪玩服务', OrderStatus.Serving), '[服务中] 订单群·陪玩服务');
  assert.equal(buildOrderGroupTitle('陪玩服务', OrderStatus.Completed), '[已结束] 订单群·陪玩服务');
  assert.equal(
    buildOrderGroupTitle('陪玩服务', OrderStatus.RefundReviewing),
    '[退款审核] 订单群·陪玩服务',
  );
  assert.equal(buildOrderGroupTitle('陪玩服务', OrderStatus.Refunded), '[已退款] 订单群·陪玩服务');

  const longest = buildOrderGroupTitle('竞'.repeat(128), OrderStatus.Serving);
  assert.equal(Array.from(longest).length, ORDER_GROUP_TITLE_MAX_LENGTH);
  assert.ok(longest.startsWith('[服务中] 订单群·'));
});

test('状态同步发现订单群关联被旧保存清空时会恢复关联和最新标题', async () => {
  const order = createOrder(OrderStatus.Serving);
  order.conversationId = '';
  let ensureCalls = 0;
  let linkWrites = 0;
  let synchronizedTitle = '';
  const orders = {
    findById: async () => order,
    updateConversationId: async (_id: string, conversationId: string) => {
      linkWrites += 1;
      order.conversationId = conversationId;
    },
  } as unknown as OrderRepository;
  const groups = {
    ensureSystemGroup: async (conversationId: string) => {
      ensureCalls += 1;
      return conversationId;
    },
    syncSystemGroupTitle: async (_conversationId: string, title: string) => {
      synchronizedTitle = title;
      return SystemGroupTitleSyncResult.Updated;
    },
  } as unknown as GroupFacade;
  const users = {
    paginateProfilesByRole: async () => [[], 0],
  } as unknown as UserDirectory;
  const service = new OrderGroupService(orders, groups, users);

  await service.syncTitle(order);

  assert.equal(order.conversationId, order.id);
  assert.equal(ensureCalls, 1);
  assert.equal(linkWrites, 1);
  assert.equal(synchronizedTitle, '[服务中] 订单群·陪玩服务');
});

test('下发订单保存待接单状态后同步群标题', async () => {
  const order = createOrder(OrderStatus.PendingService);
  let synchronizedStatus: OrderStatus | null = null;
  const orders = {
    findById: async () => order,
    claimForDispatch: async () => {
      order.status = OrderStatus.Dispatching;
      order.dispatchedAt = new Date();
      return order;
    },
  } as unknown as OrderRepository;
  const scope = {
    assertCanHandle: async () => undefined,
  } as unknown as ServiceAgentScope;
  const groups = {
    syncTitle: async (saved: OrderEntity) => {
      synchronizedStatus = saved.status;
    },
  } as unknown as OrderGroupService;
  const useCase = new DispatchOrderUseCase(orders, scope, groups);

  const result = await useCase.execute('agent-1', order.id);

  assert.equal(result.status, OrderStatus.Dispatching);
  assert.equal(synchronizedStatus, OrderStatus.Dispatching);
  assert.ok(order.dispatchedAt instanceof Date);
});

test('完成订单保存成功后同步已结束标题，保存失败时不提前同步', async () => {
  const order = createOrder(OrderStatus.Serving);
  order.boosterId = 'booster-1';
  let synchronized = 0;
  let failSave = false;
  const orders = {
    findById: async () => order,
    save: async (saved: OrderEntity) => {
      if (failSave) {
        throw new Error('订单保存失败');
      }
      return saved;
    },
  } as unknown as OrderRepository;
  const boosterAccess = {
    assert: async () => undefined,
  } as unknown as BoosterAccess;
  const boosterProgress = {
    recordCompletedOrder: async () => ({
      level: 1,
      name: '测试等级',
      minCompletedOrders: 0,
      commissionRateBp: 0,
    }),
  } as unknown as BoosterProgressService;
  const ledger = {
    adjustBalance: async () => {
      throw new Error('零提成不应写钱包');
    },
  } as unknown as WalletLedger;
  const wallet = {} as WalletService;
  const groups = {
    syncTitle: async (saved: OrderEntity) => {
      synchronized += 1;
      assert.equal(saved.status, OrderStatus.Completed);
    },
  } as unknown as OrderGroupService;
  const useCase = new CompleteBoosterOrderUseCase(
    orders,
    boosterAccess,
    boosterProgress,
    ledger,
    wallet,
    groups,
  );

  const result = await useCase.execute('booster-1', order.id);

  assert.equal(result.status, OrderStatus.Completed);
  assert.equal(synchronized, 1);

  order.status = OrderStatus.Serving;
  order.completedAt = null;
  failSave = true;
  await assert.rejects(useCase.execute('booster-1', order.id), /订单保存失败/);
  assert.equal(synchronized, 1);
});

test('订单群标题同步使用数据库最新状态，旧副作用不能把标题倒退', async () => {
  const stale = Object.assign(new OrderEntity(), {
    id: 'order-title-latest',
    orderNo: 'ORDER-TITLE-LATEST',
    productTitle: '陪玩服务',
    status: OrderStatus.Serving,
    conversationId: 'conversation-1',
  });
  const latest = Object.assign(new OrderEntity(), {
    ...stale,
    status: OrderStatus.Completed,
  });
  let synchronizedTitle = '';
  const orders = {
    findById: async () => latest,
  } as unknown as OrderRepository;
  const groups = {
    syncSystemGroupTitle: async (_conversationId: string, title: string) => {
      synchronizedTitle = title;
      return SystemGroupTitleSyncResult.Updated;
    },
  } as unknown as GroupFacade;
  const service = new OrderGroupService(orders, groups, {} as UserDirectory);

  await service.syncTitle(stale);

  assert.equal(synchronizedTitle, '[已结束] 订单群·陪玩服务');
});

test('订单群标题 CAS 冲突后重读最新状态，交错写入不能把标题倒退', async () => {
  const conversation = Object.assign(new ConversationEntity(), {
    id: 'conversation-title-race',
    type: ConversationType.Group,
    title: '[待接单] 订单群·陪玩服务',
    version: 1,
  });
  const serving = Object.assign(new OrderEntity(), {
    id: 'order-title-race',
    orderNo: 'ORDER-TITLE-RACE',
    productTitle: '陪玩服务',
    status: OrderStatus.Serving,
    conversationId: conversation.id,
  });
  const completed = Object.assign(new OrderEntity(), {
    ...serving,
    status: OrderStatus.Completed,
  });
  let latestOrder = serving;
  let compareCalls = 0;
  let releaseFirstCompare: () => void = () => undefined;
  let signalFirstCompare: () => void = () => undefined;
  const firstCompareEntered = new Promise<void>((resolve) => {
    signalFirstCompare = resolve;
  });
  const firstCompareReleased = new Promise<void>((resolve) => {
    releaseFirstCompare = resolve;
  });
  const conversations = {
    findById: async () => Object.assign(new ConversationEntity(), conversation),
    compareAndSetTitle: async (_id: string, expectedVersion: number, nextTitle: string) => {
      compareCalls += 1;
      if (compareCalls === 1) {
        signalFirstCompare();
        await firstCompareReleased;
      }
      if (conversation.version !== expectedVersion) {
        return null;
      }
      conversation.title = nextTitle;
      conversation.version += 1;
      return Object.assign(new ConversationEntity(), conversation);
    },
  } as unknown as ConversationRepository;
  const facade = new GroupFacade(
    conversations,
    {} as ConversationMemberRepository,
    { pushToMembers: async () => undefined } as unknown as ConversationNotifier,
    {} as SystemMessageService,
  );
  const orders = {
    findById: async () => latestOrder,
  } as unknown as OrderRepository;
  const service = new OrderGroupService(orders, facade, {} as UserDirectory);

  const staleSync = service.syncTitle(serving);
  await firstCompareEntered;
  latestOrder = completed;
  await service.syncTitle(completed);
  // 模拟人工改名把标题恢复成旧值；版本 CAS 仍必须识别 ABA。
  conversation.title = '[待接单] 订单群·陪玩服务';
  conversation.version += 1;
  releaseFirstCompare();
  await staleSync;

  assert.equal(conversation.title, '[已结束] 订单群·陪玩服务');
  assert.equal(compareCalls, 3);
});

test('订单读取后状态再推进时，旧同步写入后会复核并恢复最新标题', async () => {
  const serving = Object.assign(new OrderEntity(), {
    id: 'order-title-post-check',
    orderNo: 'ORDER-TITLE-POST-CHECK',
    productTitle: '陪玩服务',
    status: OrderStatus.Serving,
    conversationId: 'conversation-title-post-check',
  });
  const completed = Object.assign(new OrderEntity(), {
    ...serving,
    status: OrderStatus.Completed,
  });
  let latestOrder = serving;
  let conversationTitle = '[待接单] 订单群·陪玩服务';
  let servingWriteCalls = 0;
  let releaseServingWrite: () => void = () => undefined;
  let signalServingWrite: () => void = () => undefined;
  const servingWriteEntered = new Promise<void>((resolve) => {
    signalServingWrite = resolve;
  });
  const servingWriteReleased = new Promise<void>((resolve) => {
    releaseServingWrite = resolve;
  });
  const groups = {
    syncSystemGroupTitle: async (_conversationId: string, title: string) => {
      if (title === '[服务中] 订单群·陪玩服务' && servingWriteCalls === 0) {
        servingWriteCalls += 1;
        signalServingWrite();
        await servingWriteReleased;
      }
      conversationTitle = title;
      return SystemGroupTitleSyncResult.Updated;
    },
  } as unknown as GroupFacade;
  const orders = {
    findById: async () => latestOrder,
  } as unknown as OrderRepository;
  const service = new OrderGroupService(orders, groups, {} as UserDirectory);

  const staleSync = service.syncTitle(serving);
  await servingWriteEntered;
  latestOrder = completed;
  await service.syncTitle(completed);
  releaseServingWrite();
  await staleSync;

  assert.equal(conversationTitle, '[已结束] 订单群·陪玩服务');
  assert.equal(servingWriteCalls, 1);
});

test('打手进群失败不回滚服务中标题同步', async (t) => {
  t.mock.method(Logger.prototype, 'error', () => undefined);
  const order = Object.assign(new OrderEntity(), {
    id: 'order-serving-title',
    orderNo: 'ORDER-SERVING-TITLE',
    productTitle: '陪玩服务',
    status: OrderStatus.Serving,
    conversationId: 'conversation-serving',
  });
  let synchronizedTitle = '';
  const orders = {
    findById: async () => order,
  } as unknown as OrderRepository;
  const groups = {
    syncSystemGroupTitle: async (_conversationId: string, title: string) => {
      synchronizedTitle = title;
      return SystemGroupTitleSyncResult.Updated;
    },
    joinGroup: async () => {
      throw new Error('成员写入暂不可用');
    },
  } as unknown as GroupFacade;
  const users = {
    resolveNames: async () => new Map([['booster-1', '打手一号']]),
  } as unknown as UserDirectory;
  const service = new OrderGroupService(orders, groups, users);

  await assert.doesNotReject(service.joinBooster(order, 'booster-1'));

  assert.equal(synchronizedTitle, '[服务中] 订单群·陪玩服务');
});

test('系统群标题变化只写一次，通知失败不回滚持久化标题', async (t) => {
  t.mock.method(Logger.prototype, 'error', () => undefined);
  const conversation = Object.assign(new ConversationEntity(), {
    id: 'conversation-title-1',
    type: ConversationType.Group,
    title: '[待接单] 订单群·陪玩服务',
    version: 1,
  });
  let conversationWrites = 0;
  let notificationAttempts = 0;
  const conversations = {
    findById: async () => conversation,
    compareAndSetTitle: async (_id: string, expectedVersion: number, nextTitle: string) => {
      if (conversation.version !== expectedVersion) {
        return null;
      }
      conversationWrites += 1;
      conversation.title = nextTitle;
      conversation.version += 1;
      return conversation;
    },
  } as unknown as ConversationRepository;
  const notifier = {
    pushToMembers: async () => {
      notificationAttempts += 1;
      throw new Error('实时通道暂不可用');
    },
  } as unknown as ConversationNotifier;
  const facade = new GroupFacade(
    conversations,
    {} as ConversationMemberRepository,
    notifier,
    {} as SystemMessageService,
  );
  const servingTitle = buildOrderGroupTitle('陪玩服务', OrderStatus.Serving);

  await assert.doesNotReject(facade.syncSystemGroupTitle(conversation.id, servingTitle));
  await assert.doesNotReject(facade.syncSystemGroupTitle(conversation.id, servingTitle));

  assert.equal(conversation.title, '[服务中] 订单群·陪玩服务');
  assert.equal(conversationWrites, 1);
  assert.equal(notificationAttempts, 1);
});

function createOrder(status: OrderStatus): OrderEntity {
  return Object.assign(new OrderEntity(), {
    id: 'order-group-title-1',
    tenantId: 'tenant-1',
    orderNo: 'ORDER-GROUP-TITLE-1',
    userId: 'user-1',
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
    amountFen: 100,
    originalAmountFen: 100,
    discountBp: 10_000,
    couponDeductionFen: 0,
    commissionFen: 0,
    commissionRateBp: 0,
    provider: OrderPaymentMethod.Balance,
    providerTradeNo: 'BALANCE-order-1',
    status,
    remark: '',
    remarkMedia: [],
    accountInfo: '',
    gameAccountId: '123456',
    gameTextId: '',
    serviceRegion: 'delta-mobile',
    paidAt: new Date('2026-07-22T00:00:00.000Z'),
    dispatchedAt: null,
    acceptedAt: new Date('2026-07-22T00:01:00.000Z'),
    completedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-07-22T00:00:00.000Z'),
    updatedAt: new Date('2026-07-22T00:01:00.000Z'),
  });
}
