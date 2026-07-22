import assert from 'node:assert/strict';
import test from 'node:test';
import { Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { IM_EVENTS, MessageType } from '@app/contracts';
import { ChatRealtimeService } from '../../src/modules/im/application/chat-realtime.service';
import { SystemMessageService } from '../../src/modules/im/application/system-message.service';
import { ConversationMemberEntity } from '../../src/modules/im/domain/conversation-member.entity';
import type { ConversationMemberRepository } from '../../src/modules/im/domain/conversation-member-repository.interface';
import type { MessageRepository } from '../../src/modules/im/domain/message-repository.interface';

interface RecordedEmission {
  event: string;
  payload: unknown;
  room: string;
}

function messageRepository(): Pick<MessageRepository, 'save'> {
  return {
    async save(message) {
      message.id = 'message-system-1';
      message.createdAt = new Date('2026-07-22T00:00:00.000Z');
      message.updatedAt = message.createdAt;
      return message;
    },
  };
}

function member(userId: string): ConversationMemberEntity {
  const entity = new ConversationMemberEntity();
  entity.conversationId = 'conversation-1';
  entity.userId = userId;
  return entity;
}

function bindRecorder(realtime: ChatRealtimeService, emissions: RecordedEmission[]): void {
  realtime.bind({
    to(room: string) {
      return {
        emit(event: string, payload: unknown): void {
          emissions.push({ event, payload, room });
        },
      };
    },
  } as unknown as Server);
}

test('系统消息向全部会话成员发送不含正文的未读刷新信号', async () => {
  const realtime = new ChatRealtimeService();
  const emissions: RecordedEmission[] = [];
  bindRecorder(realtime, emissions);
  const memberRepo: Pick<ConversationMemberRepository, 'findByConversation'> = {
    async findByConversation() {
      return [member('user-1'), member('user-2')];
    },
  };
  const service = new SystemMessageService(
    messageRepository() as MessageRepository,
    memberRepo as ConversationMemberRepository,
    realtime,
  );

  await service.post('conversation-1', '订单状态已更新');

  assert.deepEqual(emissions, [
    {
      event: IM_EVENTS.unreadChanged,
      payload: null,
      room: realtime.userRoom('user-1'),
    },
    {
      event: IM_EVENTS.unreadChanged,
      payload: null,
      room: realtime.userRoom('user-2'),
    },
    {
      event: IM_EVENTS.receive,
      payload: {
        id: 'message-system-1',
        conversationId: 'conversation-1',
        senderId: 'system',
        type: MessageType.System,
        content: '订单状态已更新',
        mentions: null,
        replyTo: null,
        createdAt: new Date('2026-07-22T00:00:00.000Z').getTime(),
      },
      room: realtime.conversationRoom('conversation-1'),
    },
  ]);
});

test('个人信号查询失败时保留系统消息并由轮询降级发现', async (t) => {
  t.mock.method(Logger.prototype, 'warn', () => undefined);
  const realtime = new ChatRealtimeService();
  const emissions: RecordedEmission[] = [];
  bindRecorder(realtime, emissions);
  const memberRepo: Pick<ConversationMemberRepository, 'findByConversation'> = {
    async findByConversation() {
      throw new Error('database unavailable');
    },
  };
  const messages = messageRepository();
  const service = new SystemMessageService(
    messages as MessageRepository,
    memberRepo as ConversationMemberRepository,
    realtime,
  );

  await assert.doesNotReject(service.post('conversation-1', '订单状态已更新'));

  assert.equal(emissions.length, 1);
  assert.equal(emissions[0]?.event, IM_EVENTS.receive);
});
