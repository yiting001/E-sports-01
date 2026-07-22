import assert from 'node:assert/strict';
import test from 'node:test';
import type { Server } from 'socket.io';
import {
  ConversationMemberRole,
  ConversationStatus,
  ConversationType,
  type ConversationView,
} from '@app/contracts';
import type { ConfigService } from '../../src/modules/config/application/config.service';
import { ChatRealtimeService } from '../../src/modules/im/application/chat-realtime.service';
import type { ConversationNotifier } from '../../src/modules/im/application/conversation-notifier.service';
import type { ConversationViewAssembler } from '../../src/modules/im/application/conversation-view.assembler';
import type { ServiceAssignmentService } from '../../src/modules/im/application/service-assignment.service';
import { StartServiceUseCase } from '../../src/modules/im/application/use-cases/start-service.usecase';
import type { ConversationMemberRepository } from '../../src/modules/im/domain/conversation-member-repository.interface';
import type { ConversationEntity } from '../../src/modules/im/domain/conversation.entity';
import type { ConversationRepository } from '../../src/modules/im/domain/conversation-repository.interface';
import type { UserDirectory } from '../../src/modules/rbac/application/user-directory.service';
import type { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

interface RecordedEmission {
  event: string;
  payload: unknown;
  rooms: string[];
}

function bindRecordingServer(realtime: ChatRealtimeService): RecordedEmission[] {
  const emissions: RecordedEmission[] = [];
  const server = {
    to(rooms: string | string[]) {
      const roomList = Array.isArray(rooms) ? rooms : [rooms];
      return {
        emit(event: string, payload: unknown): void {
          emissions.push({ event, payload, rooms: roomList });
        },
      };
    },
  };
  realtime.bind(server as unknown as Server);
  return emissions;
}

test('坐席房间、在线索引和广播按租户隔离，超管只进入跨租户观察房间', () => {
  const realtime = new ChatRealtimeService();
  const emissions = bindRecordingServer(realtime);
  const tenantOneRoom = realtime.agentsRoom('tenant-1', false);
  const tenantTwoRoom = realtime.agentsRoom('tenant-2', false);
  const superRoom = realtime.agentsRoom(null, true);

  assert.ok(tenantOneRoom);
  assert.ok(tenantTwoRoom);
  assert.ok(superRoom);
  assert.notEqual(tenantOneRoom, tenantTwoRoom);
  assert.equal(realtime.agentsRoom(null, false), null);

  realtime.registerAgent('socket-1', 'agent-1', 'tenant-1', false);
  realtime.registerAgent('socket-2', 'agent-1', 'tenant-1', false);
  realtime.registerAgent('socket-3', 'agent-2', 'tenant-2', false);
  realtime.registerAgent('socket-4', 'super-admin', null, true);

  assert.deepEqual(realtime.onlineAgents('tenant-1'), ['agent-1']);
  assert.deepEqual(realtime.onlineAgents('tenant-2'), ['agent-2']);

  realtime.unregisterAgent('socket-1');
  assert.deepEqual(realtime.onlineAgents('tenant-1'), ['agent-1']);

  const payload = { conversationId: 'conversation-1' };
  realtime.emitToAgents('tenant-1', 'im:service:queued', payload);

  assert.equal(emissions.length, 1);
  assert.equal(emissions[0]?.event, 'im:service:queued');
  assert.equal(emissions[0]?.payload, payload);
  assert.deepEqual(new Set(emissions[0]?.rooms), new Set([tenantOneRoom, superRoom]));
  assert.equal(emissions[0]?.rooms.includes(tenantTwoRoom), false);
});

test('客服自动分配只选择会话租户坐席，超管不作为业务坐席候选', async () => {
  const realtime = new ChatRealtimeService();
  const emissions = bindRecordingServer(realtime);
  realtime.registerAgent('socket-1', 'agent-1', 'tenant-1', false);
  realtime.registerAgent('socket-2', 'agent-2', 'tenant-2', false);
  realtime.registerAgent('socket-3', 'super-admin', null, true);

  const tenantTwo = createStartServiceHarness(realtime, 'tenant-2', 'tenant-1');
  await tenantTwo.useCase.execute('visitor-2', { subject: '租户二咨询' });
  assert.deepEqual(tenantTwo.assignedAgents, ['agent-2']);

  const contextFallback = createStartServiceHarness(realtime, '', 'tenant-1');
  await contextFallback.useCase.execute('visitor-1', { subject: '租户一咨询' });
  assert.deepEqual(contextFallback.assignedAgents, ['agent-1']);

  const tenantThree = createStartServiceHarness(realtime, 'tenant-3', 'tenant-1');
  await tenantThree.useCase.execute('visitor-3', { subject: '租户三咨询' });
  assert.deepEqual(tenantThree.assignedAgents, []);
  assert.deepEqual(
    new Set(emissions.at(-1)?.rooms),
    new Set([realtime.agentsRoom('tenant-3', false), realtime.agentsRoom(null, true)]),
  );
});

function createStartServiceHarness(
  realtime: ChatRealtimeService,
  savedTenantId: string,
  contextTenantId: string,
): { assignedAgents: string[]; useCase: StartServiceUseCase } {
  let savedConversation: ConversationEntity | null = null;
  const conversations: Pick<ConversationRepository, 'findById' | 'save'> = {
    async save(conversation) {
      conversation.id = `conversation-${savedTenantId}`;
      conversation.tenantId = savedTenantId;
      conversation.createdAt = new Date('2026-07-22T00:00:00.000Z');
      conversation.updatedAt = conversation.createdAt;
      savedConversation = conversation;
      return conversation;
    },
    async findById() {
      return savedConversation;
    },
  };
  const members: Pick<ConversationMemberRepository, 'saveMany'> = {
    async saveMany(rows) {
      return rows;
    },
  };
  const config = {
    async getBoolean(): Promise<boolean> {
      return true;
    },
  };
  const users = {
    async resolveNames(ids: string[]): Promise<Map<string, string>> {
      return new Map(ids.map((id) => [id, `用户-${id}`]));
    },
  };
  const notifier = {
    async pushToMembers(): Promise<void> {
      return undefined;
    },
  };
  const assignedAgents: string[] = [];
  const assignment = {
    async attachAgent(_conversation: ConversationEntity, agentId: string): Promise<void> {
      assignedAgents.push(agentId);
    },
  };
  const assembler = {
    async toView(conversation: ConversationEntity): Promise<ConversationView> {
      return {
        id: conversation.id,
        type: ConversationType.Service,
        viewerRole: ConversationMemberRole.Owner,
        title: conversation.title,
        ownerId: conversation.ownerId,
        status: ConversationStatus.Pending,
        memberCount: 1,
        lastMessage: null,
        unread: 0,
        createdAt: conversation.createdAt.getTime(),
        updatedAt: conversation.updatedAt.getTime(),
      };
    },
  };
  const tenant = { tenantId: contextTenantId };

  const useCase = new StartServiceUseCase(
    conversations as unknown as ConversationRepository,
    members as unknown as ConversationMemberRepository,
    config as unknown as ConfigService,
    users as unknown as UserDirectory,
    realtime,
    assembler as unknown as ConversationViewAssembler,
    notifier as unknown as ConversationNotifier,
    assignment as unknown as ServiceAssignmentService,
    tenant as unknown as TenantContextService,
  );
  return { assignedAgents, useCase };
}
