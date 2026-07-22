import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ConversationMemberRole,
  ConversationStatus,
  ConversationType,
} from '@app/contracts';
import type { UserDirectory } from '../../src/modules/rbac/application/user-directory.service';
import { ConversationViewAssembler } from '../../src/modules/im/application/conversation-view.assembler';
import { ConversationEntity } from '../../src/modules/im/domain/conversation.entity';
import { ConversationMemberEntity } from '../../src/modules/im/domain/conversation-member.entity';
import type { ConversationMemberRepository } from '../../src/modules/im/domain/conversation-member-repository.interface';
import type { MessageRepository } from '../../src/modules/im/domain/message-repository.interface';

test('会话列表视图返回当前查看者成员角色供访客与坐席角标分流', async () => {
  const viewer = new ConversationMemberEntity();
  viewer.conversationId = 'conversation-1';
  viewer.userId = 'agent-1';
  viewer.role = ConversationMemberRole.Agent;
  viewer.lastReadAt = null;

  const members: Pick<
    ConversationMemberRepository,
    'countByConversation' | 'findByConversation' | 'findOne'
  > = {
    async countByConversation() {
      return 2;
    },
    async findByConversation() {
      return [viewer];
    },
    async findOne() {
      return viewer;
    },
  };
  const messages: Pick<MessageRepository, 'countUnread' | 'findLatest'> = {
    async countUnread() {
      return 3;
    },
    async findLatest() {
      return null;
    },
  };
  const users: Pick<UserDirectory, 'resolveNames'> = {
    async resolveNames() {
      return new Map();
    },
  };
  const assembler = new ConversationViewAssembler(
    members as ConversationMemberRepository,
    messages as MessageRepository,
    users as UserDirectory,
  );
  const conversation = new ConversationEntity();
  conversation.id = 'conversation-1';
  conversation.type = ConversationType.Service;
  conversation.title = '客服会话';
  conversation.ownerId = 'visitor-1';
  conversation.status = ConversationStatus.Active;
  conversation.createdAt = new Date('2026-07-22T00:00:00.000Z');
  conversation.updatedAt = conversation.createdAt;

  const view = await assembler.toView(conversation, 'agent-1');

  assert.equal(view.viewerRole, ConversationMemberRole.Agent);
  assert.equal(view.unread, 3);
});
