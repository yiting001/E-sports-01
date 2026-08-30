import assert from 'node:assert/strict';
import test from 'node:test';
import { Logger } from '@nestjs/common';
import { OrderPaymentMethod, OrderStatus } from '@app/contracts';
import type { ConfigService } from '../../src/modules/config/application/config.service';
import type { ConversationNotifier } from '../../src/modules/im/application/conversation-notifier.service';
import {
  GroupFacade,
  SystemGroupTitleSyncResult,
} from '../../src/modules/im/application/group-facade.service';
import type { SystemMessageService } from '../../src/modules/im/application/system-message.service';
import type { ConversationMemberRepository } from '../../src/modules/im/domain/conversation-member-repository.interface';
import { ConversationMemberEntity } from '../../src/modules/im/domain/conversation-member.entity';
import type { ConversationRepository } from '../../src/modules/im/domain/conversation-repository.interface';
import { ConversationEntity } from '../../src/modules/im/domain/conversation.entity';
import type { UserDirectory } from '../../src/modules/rbac/application/user-directory.service';
import { OrderGroupService } from '../../src/modules/order/application/order-group.service';
import { OrderPaymentSettleService } from '../../src/modules/order/application/order-payment.service';
import { QueryOrderPaymentUseCase } from '../../src/modules/order/application/use-cases/query-order-payment.usecase';
import type { OrderPaymentSettlement } from '../../src/modules/order/domain/order-payment-settlement.interface';
import type { OrderRepository } from '../../src/modules/order/domain/order-repository.interface';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';
import type { PaymentResolver } from '../../src/modules/wallet/application/payment.resolver';
import { passthroughPaymentGateway } from './payment-gateway.stub';
import type { TenantContextService } from '../../src/shared/tenant/tenant-context.service';
import type { OrderNotifyService } from '../../src/modules/order/application/order-notify.service';

/** 订单微信通知桩：单测不关心推送，只需满足依赖签名 */
function orderNotifyStub(): OrderNotifyService {
  return {
    notifyHallOrder: async () => undefined,
    notifyPendingOrder: async () => undefined,
  } as unknown as OrderNotifyService;
}

test('订单群使用订单 ID 创建一次，并在延迟补建时包含已接单打手', async () => {
  const order = Object.assign(new OrderEntity(), {
    id: '44444444-4444-4444-8444-444444444444',
    orderNo: 'ORDER-GROUP-1',
    userId: 'user-1',
    productTitle: '陪玩服务',
    serviceAgentId: 'agent-1',
    boosterId: 'booster-1',
    conversationId: '',
    status: OrderStatus.PendingService,
  });
  let groupWrites = 0;
  let conversationLinkWrites = 0;
  let receivedMembers: string[] = [];
  let receivedTitle = '';
  const synchronizedTitles: string[] = [];
  const groups = {
    ensureSystemGroup: async (
      conversationId: string,
      _ownerId: string,
      title: string,
      memberIds: string[],
    ) => {
      groupWrites += 1;
      receivedTitle = title;
      receivedMembers = memberIds;
      return conversationId;
    },
    syncSystemGroupTitle: async (_conversationId: string, title: string) => {
      synchronizedTitles.push(title);
      return SystemGroupTitleSyncResult.Updated;
    },
  } as unknown as GroupFacade;
  const orders = {
    findById: async () => order,
    updateConversationId: async (_id: string, conversationId: string) => {
      conversationLinkWrites += 1;
      order.conversationId = conversationId;
    },
  } as unknown as OrderRepository;
  const users = {
    paginateProfilesByRole: async () => [
      [{ id: 'admin-1', username: 'admin', nickname: '管理员' }],
      1,
    ],
  } as unknown as UserDirectory;
  const service = new OrderGroupService(orders, groups, users);

  await service.ensureGroup(order);
  await service.ensureGroup(order);

  assert.equal(order.conversationId, order.id);
  assert.equal(groupWrites, 1);
  assert.equal(conversationLinkWrites, 1);
  assert.equal(receivedTitle, '[待接单] 订单群·陪玩服务');
  assert.deepEqual(synchronizedTitles, ['[待接单] 订单群·陪玩服务', '[待接单] 订单群·陪玩服务']);
  assert.deepEqual(receivedMembers, ['user-1', 'agent-1', 'booster-1', 'admin-1']);
});

test('打手加入订单群时使用订单安全显示名，不写入手机号派生用户名', async () => {
  const order = Object.assign(new OrderEntity(), {
    id: '55555555-5555-4555-8555-555555555555',
    orderNo: 'ORDER-GROUP-PRIVACY',
    userId: 'user-1',
    productTitle: '陪玩服务',
    serviceAgentId: 'agent-1',
    boosterId: 'booster-1',
    boosterName: 'sms_18500000942',
    conversationId: 'conversation-1',
    status: OrderStatus.Serving,
  });
  let notice = '';
  const groups = {
    syncSystemGroupTitle: async () => SystemGroupTitleSyncResult.Unchanged,
    joinGroup: async (_conversationId: string, _userId: string, text: string) => {
      notice = text;
    },
  } as unknown as GroupFacade;
  const orders = {
    findById: async () => order,
  } as unknown as OrderRepository;
  const users = {
    async resolveDisplayNames() {
      return new Map([['booster-1', '用户0942']]);
    },
  } as unknown as UserDirectory;
  const service = new OrderGroupService(orders, groups, users);

  await service.joinBooster(order, 'booster-1');

  assert.equal(notice, '打手 用户0942 已接单，加入群聊为您服务');
  assert.doesNotMatch(notice, /1\d{10}|sms_/);
});

test('系统订单群成功创建且重复确保时复用同一会话', async (t) => {
  t.mock.method(Logger.prototype, 'error', () => undefined);
  const conversations = new Map<string, ConversationEntity>();
  const memberRows: ConversationMemberEntity[] = [];
  let conversationWrites = 0;
  let welcomeWrites = 0;
  let notificationAttempts = 0;
  const conversationRepository = {
    findById: async (id: string) => conversations.get(id) ?? null,
    save: async (conversation: ConversationEntity) => {
      conversationWrites += 1;
      conversations.set(conversation.id, conversation);
      return conversation;
    },
  } as unknown as ConversationRepository;
  const memberRepository = {
    findByConversation: async (conversationId: string) =>
      memberRows.filter((member) => member.conversationId === conversationId),
    saveMany: async (rows: ConversationMemberEntity[]) => {
      memberRows.push(...rows);
      return rows;
    },
  } as unknown as ConversationMemberRepository;
  const notifier = {
    pushToMembers: async () => {
      notificationAttempts += 1;
      throw new Error('实时通道暂不可用');
    },
  } as unknown as ConversationNotifier;
  const systemMessage = {
    post: async () => {
      welcomeWrites += 1;
    },
  } as unknown as SystemMessageService;
  const facade = new GroupFacade(conversationRepository, memberRepository, notifier, systemMessage);
  const conversationId = '22222222-2222-4222-8222-222222222222';

  const first = await facade.ensureSystemGroup(
    conversationId,
    'admin-1',
    '订单群·陪玩服务',
    ['user-1', 'admin-1'],
    '支付成功',
  );
  const second = await facade.ensureSystemGroup(
    conversationId,
    'admin-1',
    '订单群·陪玩服务',
    ['user-1', 'admin-1'],
    '支付成功',
  );

  assert.equal(first, conversationId);
  assert.equal(second, conversationId);
  assert.equal(conversationWrites, 1);
  assert.equal(welcomeWrites, 1);
  assert.equal(notificationAttempts, 1);
  assert.deepEqual(memberRows.map((member) => member.userId).sort(), ['admin-1', 'user-1']);
});

test('系统订单群成员首次写入失败后，补建复用已创建的会话并补齐成员', async () => {
  const conversations = new Map<string, ConversationEntity>();
  const memberRows: ConversationMemberEntity[] = [];
  let conversationWrites = 0;
  let memberWriteAttempts = 0;
  const conversationRepository = {
    findById: async (id: string) => conversations.get(id) ?? null,
    save: async (conversation: ConversationEntity) => {
      conversationWrites += 1;
      conversations.set(conversation.id, conversation);
      return conversation;
    },
  } as unknown as ConversationRepository;
  const memberRepository = {
    findByConversation: async (conversationId: string) =>
      memberRows.filter((member) => member.conversationId === conversationId),
    saveMany: async (rows: ConversationMemberEntity[]) => {
      memberWriteAttempts += 1;
      if (memberWriteAttempts === 1) {
        memberRows.push(rows[0]);
        throw new Error('成员批量写入中断');
      }
      memberRows.push(...rows);
      return rows;
    },
  } as unknown as ConversationMemberRepository;
  const notifier = {
    pushToMembers: async () => undefined,
  } as unknown as ConversationNotifier;
  const systemMessage = {
    post: async () => undefined,
  } as unknown as SystemMessageService;
  const facade = new GroupFacade(conversationRepository, memberRepository, notifier, systemMessage);
  const conversationId = '33333333-3333-4333-8333-333333333333';

  await assert.rejects(
    facade.ensureSystemGroup(conversationId, 'admin-1', '订单群·陪玩服务', ['user-1', 'admin-1']),
    /成员批量写入中断/,
  );
  const recovered = await facade.ensureSystemGroup(conversationId, 'admin-1', '订单群·陪玩服务', [
    'user-1',
    'admin-1',
  ]);

  assert.equal(recovered, conversationId);
  assert.equal(conversationWrites, 1);
  assert.equal(memberWriteAttempts, 2);
  assert.deepEqual(memberRows.map((member) => member.userId).sort(), ['admin-1', 'user-1']);
});

test('支付已落账但首次建群失败时，主动查单会补建且不回滚支付状态', async (t) => {
  t.mock.method(Logger.prototype, 'error', () => undefined);
  const order = Object.assign(new OrderEntity(), {
    id: '11111111-1111-4111-8111-111111111111',
    tenantId: '00000000-0000-0000-0000-000000000001',
    orderNo: 'ORDER-GROUP-RECOVERY-1',
    userId: 'user-1',
    productId: 'product-1',
    productTitle: '陪玩服务',
    productCover: '',
    serviceAgentId: '',
    conversationId: '',
    provider: OrderPaymentMethod.Balance,
    providerTradeNo: 'BALANCE-order-1',
    status: OrderStatus.PendingService,
    quantity: 1,
    amountFen: 300,
    originalAmountFen: 300,
    discountBp: 10_000,
    couponDeductionFen: 0,
    remark: '',
    remarkMedia: [],
    accountInfo: '',
    gameAccountId: '123456',
    gameTextId: '',
    serviceRegion: 'delta-mobile',
    boosterId: '',
    boosterName: '',
    requestedBoosterId: '',
    requestedBoosterName: '',
    paidAt: new Date('2026-07-19T00:00:00.000Z'),
    dispatchedAt: null,
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-07-19T00:00:00.000Z'),
    updatedAt: new Date('2026-07-19T00:00:00.000Z'),
  });
  const settlement = {
    settleBalance: async () => order,
  } as unknown as OrderPaymentSettlement;
  let groupAttempts = 0;
  const orderGroup = {
    ensureGroup: async (paidOrder: OrderEntity) => {
      groupAttempts += 1;
      if (groupAttempts === 1) {
        throw new Error('IM 暂时不可用');
      }
      paidOrder.conversationId = paidOrder.id;
    },
  } as unknown as OrderGroupService;
  const tenant = {
    run: <T>(_context: { tenantId: string | null; isSuper: boolean }, callback: () => T): T =>
      callback(),
  } as unknown as TenantContextService;
  const orders = {
    findById: async (id: string) => (id === order.id ? order : null),
  } as unknown as OrderRepository;
  const config = {
    getBoolean: async () => false,
  } as unknown as ConfigService;
  const payment = new OrderPaymentSettleService(
    settlement,
    orders,
    orderGroup,
    orderNotifyStub(),
    tenant,
    config,
  );
  const paymentResolver = {
    resolve: () => {
      throw new Error('已支付订单不应再次查询支付渠道');
    },
  } as unknown as PaymentResolver;
  const query = new QueryOrderPaymentUseCase(orders, paymentResolver, passthroughPaymentGateway(), payment);

  await assert.doesNotReject(payment.payWithBalance(order.id, order.userId, order.amountFen));
  assert.equal(order.status, OrderStatus.PendingService);
  assert.equal(order.conversationId, '');

  const view = await query.execute(order.userId, order.id);

  assert.equal(groupAttempts, 2);
  assert.equal(view.conversationId, order.id);
  assert.equal(order.status, OrderStatus.PendingService);
});
