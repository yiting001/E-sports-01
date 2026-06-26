import { Inject, Injectable } from '@nestjs/common';
import {
  ConversationDetailView,
  ConversationMemberRole,
  ConversationMemberView,
  ConversationType,
  ConversationView,
} from '@app/contracts';
import { UserDirectory } from '../../rbac/application/user-directory.service';
import { ConversationEntity } from '../domain/conversation.entity';
import { ConversationMemberEntity } from '../domain/conversation-member.entity';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../domain/conversation-member-repository.interface';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../domain/message-repository.interface';
import { toChatMessage } from './message.mapper';

/**
 * 会话视图组装器。
 * 把会话实体补齐为对外视图：成员数、最后一条消息、未读数、成员清单（含用户名）。
 * 集中此处避免各用例重复拼装。
 */
@Injectable()
export class ConversationViewAssembler {
  constructor(
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messages: MessageRepository,
    private readonly users: UserDirectory,
  ) {}

  /** 单个会话的列表视图（含当前查看者的未读数） */
  async toView(
    conversation: ConversationEntity,
    viewerId: string,
  ): Promise<ConversationView> {
    const [memberCount, latest, viewer] = await Promise.all([
      this.members.countByConversation(conversation.id),
      this.messages.findLatest(conversation.id),
      this.members.findOne(conversation.id, viewerId),
    ]);
    const unread = await this.messages.countSince(
      conversation.id,
      viewer?.lastReadAt ?? null,
    );
    return {
      id: conversation.id,
      type: conversation.type,
      title: await this.displayTitle(conversation, viewerId),
      ownerId: conversation.ownerId,
      status: conversation.status,
      memberCount,
      lastMessage: latest ? toChatMessage(latest) : null,
      unread,
      createdAt: conversation.createdAt.getTime(),
      updatedAt: conversation.updatedAt.getTime(),
    };
  }

  /** 会话详情（在列表视图基础上补全成员清单） */
  async toDetail(
    conversation: ConversationEntity,
    viewerId: string,
  ): Promise<ConversationDetailView> {
    const base = await this.toView(conversation, viewerId);
    const memberRows = await this.members.findByConversation(conversation.id);
    const names = await this.users.resolveNames(
      memberRows.map((m) => m.userId),
    );
    const members: ConversationMemberView[] = memberRows.map((m) =>
      this.toMemberView(m, names.get(m.userId) ?? m.userId),
    );
    return { ...base, members };
  }

  /**
   * 列表展示标题。
   * 群聊/客服用存储的 title；私聊无固定标题，按查看者视角取“对方用户名”。
   */
  private async displayTitle(
    conversation: ConversationEntity,
    viewerId: string,
  ): Promise<string> {
    if (conversation.type !== ConversationType.Private) {
      return conversation.title;
    }
    const memberRows = await this.members.findByConversation(conversation.id);
    const peerIds = memberRows
      .map((m) => m.userId)
      .filter((id) => id !== viewerId);
    const names = await this.users.resolveNames(peerIds);
    return peerIds.map((id) => names.get(id) ?? id).join('、') || '私聊';
  }

  private toMemberView(
    member: ConversationMemberEntity,
    username: string,
  ): ConversationMemberView {
    return {
      userId: member.userId,
      username,
      role: member.role as ConversationMemberRole,
      joinedAt: member.createdAt.getTime(),
      lastReadAt: member.lastReadAt ? member.lastReadAt.getTime() : null,
    };
  }
}
