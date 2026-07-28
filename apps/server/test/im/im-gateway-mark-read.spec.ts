import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatMessage } from '@app/contracts';
import { IM_EVENTS, MessageType, PERMS } from '@app/contracts';
import { ChatRealtimeService } from '../../src/modules/im/application/chat-realtime.service';
import type { ConversationAccessService } from '../../src/modules/im/application/conversation-access.service';
import type { GetHistoryUseCase } from '../../src/modules/im/application/use-cases/get-history.usecase';
import type { MarkReadUseCase } from '../../src/modules/im/application/use-cases/mark-read.usecase';
import type { SendMessageUseCase } from '../../src/modules/im/application/use-cases/send-message.usecase';
import { UserPresenceService } from '../../src/modules/im/application/user-presence.service';
import { ConversationMemberEntity } from '../../src/modules/im/domain/conversation-member.entity';
import { ImGateway } from '../../src/modules/im/interfaces/ws/im.gateway';
import { TraceContextService } from '../../src/modules/observability/application/trace-context.service';
import type { PermissionResolver } from '../../src/modules/rbac/application/permission-resolver.service';
import type { TenantResolver } from '../../src/modules/rbac/application/tenant-resolver.service';
import type { TokenService } from '../../src/modules/rbac/application/token.service';
import { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

interface EmittedEvent {
  event: string;
  payload: unknown;
}

interface GatewayAuthOptions {
  authEnabled?: boolean;
  authTenantId?: string;
  payloadTenantId?: string;
  payloadType?: 'access' | 'refresh';
  tenantEnabled?: boolean;
}

test('IM 握手拒绝刷新令牌和用户真实租户不一致的访问令牌', async () => {
  const refresh = await createGatewayHarness(false, false, [], {
    payloadType: 'refresh',
  });
  assert.equal(refresh.socket.connected, false);

  const crossTenant = await createGatewayHarness(false, false, [], {
    authTenantId: 'tenant-2',
    payloadTenantId: 'tenant-1',
  });
  assert.equal(crossTenant.socket.connected, false);

  const disabledUser = await createGatewayHarness(false, false, [], {
    authEnabled: false,
  });
  assert.equal(disabledUser.socket.connected, false);

  const disabledTenant = await createGatewayHarness(false, false, [], {
    tenantEnabled: false,
  });
  assert.equal(disabledTenant.socket.connected, false);
});

test('IM 每次入站事件都重新校验账号状态并拒绝停用后的旧连接', async () => {
  const authState: GatewayAuthOptions = {};
  const harness = await createGatewayHarness(false, false, [], authState);
  authState.authEnabled = false;

  const result = await harness.gateway.onMarkRead(harness.socket, {
    conversationId: 'conversation-1',
    messageId: 'message-1',
  });

  assert.equal(result, false);
  assert.equal(harness.socket.connected, false);
  assert.deepEqual(harness.accessChecks, []);
  assert.deepEqual(harness.markReadCalls, []);
});

test('IM 每次入站事件都拒绝真实租户发生变化的旧连接', async () => {
  const authState: GatewayAuthOptions = {};
  const harness = await createGatewayHarness(false, false, [], authState);
  authState.authTenantId = 'tenant-2';

  await harness.gateway.onSend(harness.socket, {
    conversationId: 'conversation-1',
    type: MessageType.Text,
    content: '不应发送',
  });

  assert.equal(harness.socket.connected, false);
  assert.deepEqual(harness.sendMessageCalls, []);
});

test('IM 每次入站事件都重新校验租户状态并拒绝停用后的旧连接', async () => {
  const authState: GatewayAuthOptions = {};
  const harness = await createGatewayHarness(false, false, [], authState);
  authState.tenantEnabled = false;

  const history = await harness.gateway.onJoin(harness.socket, 'conversation-1');

  assert.deepEqual(history, []);
  assert.equal(harness.socket.connected, false);
  assert.deepEqual(harness.accessChecks, []);
});

test('成员标记已读成功调用用例，越权失败不推进已读位点', async () => {
  const allowed = await createGatewayHarness(false);
  const allowedResult = await allowed.gateway.onMarkRead(allowed.socket, {
    conversationId: 'conversation-1',
    messageId: 'message-1',
  });

  assert.equal(allowedResult, true);
  assert.deepEqual(allowed.accessChecks, ['conversation-1:user-1']);
  assert.deepEqual(allowed.markReadCalls, ['conversation-1:user-1:message-1']);
  assert.deepEqual(allowed.emitted, []);

  const denied = await createGatewayHarness(true);
  const deniedResult = await denied.gateway.onMarkRead(denied.socket, {
    conversationId: 'conversation-2',
    messageId: 'message-2',
  });

  assert.equal(deniedResult, false);
  assert.deepEqual(denied.accessChecks, ['conversation-2:user-1']);
  assert.deepEqual(denied.markReadCalls, []);
  assert.deepEqual(denied.emitted, [
    { event: IM_EVENTS.error, payload: { message: '无权访问该会话' } },
  ]);
});

test('加入会话只返回历史，不在页面可见确认前提前标记已读', async () => {
  const historyMessage: ChatMessage = {
    id: 'message-history-1',
    conversationId: 'conversation-1',
    senderId: 'user-2',
    type: MessageType.Text,
    content: '历史消息',
    mentions: null,
    replyTo: null,
    createdAt: 1,
  };
  const harness = await createGatewayHarness(false, false, [historyMessage]);

  const history = await harness.gateway.onJoin(harness.socket, 'conversation-1');

  assert.deepEqual(history, [historyMessage]);
  assert.deepEqual(harness.markReadCalls, []);
});

test('布局观察客服队列不参与自动分配，工作台订阅才登记在线坐席', async () => {
  const harness = await createGatewayHarness(false, true);

  await harness.gateway.onObserveService(harness.socket);

  assert.deepEqual(harness.realtime.onlineAgents('tenant-1'), []);
  assert.ok(harness.joinedRooms.includes(harness.realtime.agentsRoom('tenant-1', false) ?? ''));

  await harness.gateway.onWatchService(harness.socket);

  assert.deepEqual(harness.realtime.onlineAgents('tenant-1'), ['user-1']);
});

async function createGatewayHarness(
  denyAccess: boolean,
  serviceAgent = false,
  historyMessages: ChatMessage[] = [],
  authOptions: GatewayAuthOptions = {},
): Promise<{
  accessChecks: string[];
  emitted: EmittedEvent[];
  gateway: ImGateway;
  joinedRooms: string[];
  markReadCalls: string[];
  realtime: ChatRealtimeService;
  sendMessageCalls: string[];
  socket: Parameters<ImGateway['onMarkRead']>[0];
}> {
  const tokens: Pick<TokenService, 'verifyAccess'> = {
    async verifyAccess() {
      return {
        sub: 'user-1',
        username: 'operator',
        tenantId: authOptions.payloadTenantId ?? 'tenant-1',
        type: authOptions.payloadType ?? 'access',
      };
    },
  };
  const permissions: Pick<PermissionResolver, 'resolve'> = {
    async resolve() {
      return {
        tenantId: authOptions.authTenantId ?? 'tenant-1',
        enabled: authOptions.authEnabled ?? true,
        roles: [],
        permissions: serviceAgent ? [PERMS.im.serviceAgent] : [],
        isSuper: false,
      };
    },
  };
  const tenants: Pick<TenantResolver, 'assertTenantEnabled'> = {
    async assertTenantEnabled() {
      if (authOptions.tenantEnabled === false) {
        throw new Error('所属租户已停用');
      }
    },
  };
  const accessChecks: string[] = [];
  const access: Pick<ConversationAccessService, 'assertMember'> = {
    async assertMember(conversationId, userId) {
      accessChecks.push(`${conversationId}:${userId}`);
      if (denyAccess) {
        throw new Error('无权访问该会话');
      }
      const member = new ConversationMemberEntity();
      member.conversationId = conversationId;
      member.userId = userId;
      return member;
    },
  };
  const markReadCalls: string[] = [];
  const markRead: Pick<MarkReadUseCase, 'execute'> = {
    async execute(conversationId, userId, messageId) {
      markReadCalls.push(`${conversationId}:${userId}:${messageId}`);
    },
  };
  const sendMessageCalls: string[] = [];
  const sendMessage: Pick<SendMessageUseCase, 'execute'> = {
    async execute(payload, senderId) {
      sendMessageCalls.push(`${payload.conversationId}:${senderId}:${payload.content}`);
      return {
        id: 'message-sent-1',
        conversationId: payload.conversationId,
        senderId,
        type: payload.type,
        content: payload.content,
        mentions: null,
        replyTo: null,
        createdAt: 1,
      };
    },
  };
  const history: Pick<GetHistoryUseCase, 'execute'> = {
    async execute() {
      return historyMessages;
    },
  };
  const emitted: EmittedEvent[] = [];
  const joinedRooms: string[] = [];
  const socketShape = {
    connected: true,
    data: {
      userId: '',
      username: '',
      tenantId: null,
      isSuper: false,
    },
    disconnect(): void {
      this.connected = false;
    },
    emit(event: string, payload: unknown): void {
      emitted.push({ event, payload });
    },
    handshake: { auth: { token: 'access-token' }, headers: {} },
    id: 'socket-1',
    async join(room: string): Promise<void> {
      joinedRooms.push(room);
    },
  };
  const socket = socketShape as unknown as Parameters<ImGateway['onMarkRead']>[0];
  const realtime = new ChatRealtimeService();
  const gateway = new ImGateway(
    tokens as TokenService,
    permissions as PermissionResolver,
    tenants as TenantResolver,
    sendMessage as SendMessageUseCase,
    history as GetHistoryUseCase,
    markRead as MarkReadUseCase,
    access as ConversationAccessService,
    realtime,
    new UserPresenceService(),
    new TraceContextService(),
    new TenantContextService(),
  );

  await gateway.handleConnection(socket);
  return {
    accessChecks,
    emitted,
    gateway,
    joinedRooms,
    markReadCalls,
    realtime,
    sendMessageCalls,
    socket,
  };
}
