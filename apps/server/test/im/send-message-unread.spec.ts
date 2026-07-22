import assert from 'node:assert/strict';
import test from 'node:test';
import type { Server } from 'socket.io';
import { IM_EVENTS, MessageType } from '@app/contracts';
import type { UserDirectory } from '../../src/modules/rbac/application/user-directory.service';
import { ChatRealtimeService } from '../../src/modules/im/application/chat-realtime.service';
import type { ConversationAccessService } from '../../src/modules/im/application/conversation-access.service';
import { ConversationMemberEntity } from '../../src/modules/im/domain/conversation-member.entity';
import type { ConversationMemberRepository } from '../../src/modules/im/domain/conversation-member-repository.interface';
import { ChatMessageEntity } from '../../src/modules/im/domain/message.entity';
import type { MessageRepository } from '../../src/modules/im/domain/message-repository.interface';
import { SendMessageUseCase } from '../../src/modules/im/application/use-cases/send-message.usecase';

interface RecordedEmission {
  event: string;
  payload: unknown;
  room: string;
}

test('发送消息只向其他会话成员的个人房间推送未读刷新信号', async () => {
  const realtime = new ChatRealtimeService();
  const emissions: RecordedEmission[] = [];
  realtime.bind({
    to(room: string) {
      return {
        emit(event: string, payload: unknown): void {
          emissions.push({ event, payload, room });
        },
      };
    },
  } as unknown as Server);

  const messageRepo: Pick<MessageRepository, 'findById' | 'save'> = {
    async findById() {
      return null;
    },
    async save(message) {
      message.id = 'message-1';
      message.createdAt = new Date('2026-07-22T00:00:00.000Z');
      message.updatedAt = message.createdAt;
      return message;
    },
  };
  const members = ['sender-1', 'recipient-1', 'recipient-2'].map((userId) => {
    const member = new ConversationMemberEntity();
    member.conversationId = 'conversation-1';
    member.userId = userId;
    return member;
  });
  const memberRepo: Pick<ConversationMemberRepository, 'findByConversation'> = {
    async findByConversation() {
      return members;
    },
  };
  const access: Pick<ConversationAccessService, 'assertMember'> = {
    async assertMember() {
      return members[0];
    },
  };
  const users: Pick<UserDirectory, 'resolveNames'> = {
    async resolveNames() {
      return new Map();
    },
  };
  const useCase = new SendMessageUseCase(
    messageRepo as MessageRepository,
    memberRepo as ConversationMemberRepository,
    access as ConversationAccessService,
    users as UserDirectory,
    realtime,
  );

  const saved = await useCase.execute(
    {
      conversationId: 'conversation-1',
      type: MessageType.Text,
      content: '新消息',
    },
    'sender-1',
  );

  assert.equal(saved.id, 'message-1');
  assert.deepEqual(emissions, [
    {
      event: IM_EVENTS.unreadChanged,
      payload: null,
      room: realtime.userRoom('recipient-1'),
    },
    {
      event: IM_EVENTS.unreadChanged,
      payload: null,
      room: realtime.userRoom('recipient-2'),
    },
  ]);
  assert.equal(emissions.some((item) => item.room === realtime.userRoom('sender-1')), false);
});
