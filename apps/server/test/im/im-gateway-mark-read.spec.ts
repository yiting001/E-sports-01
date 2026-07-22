import assert from 'node:assert/strict';
import test from 'node:test';
import { IM_EVENTS, PERMS } from '@app/contracts';
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
import type { TokenService } from '../../src/modules/rbac/application/token.service';
import { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

interface EmittedEvent {
  event: string;
  payload: unknown;
}

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
): Promise<{
  accessChecks: string[];
  emitted: EmittedEvent[];
  gateway: ImGateway;
  joinedRooms: string[];
  markReadCalls: string[];
  realtime: ChatRealtimeService;
  socket: Parameters<ImGateway['onMarkRead']>[0];
}> {
  const tokens: Pick<TokenService, 'verifyAccess'> = {
    async verifyAccess() {
      return {
        sub: 'user-1',
        username: 'operator',
        tenantId: 'tenant-1',
        type: 'access',
      };
    },
  };
  const permissions: Pick<PermissionResolver, 'resolve'> = {
    async resolve() {
      return {
        roles: [],
        permissions: serviceAgent ? [PERMS.im.serviceAgent] : [],
        isSuper: false,
      };
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
  const sendMessage: Pick<SendMessageUseCase, 'execute'> = {
    async execute() {
      throw new Error('本测试不调用发送消息');
    },
  };
  const history: Pick<GetHistoryUseCase, 'execute'> = {
    async execute() {
      return [];
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
      return undefined;
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
    socket,
  };
}
