import { Inject, Injectable } from '@nestjs/common';
import { IM_EVENTS } from '@app/contracts';
import { ConversationEntity } from '../domain/conversation.entity';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../domain/conversation-member-repository.interface';
import { ChatRealtimeService } from './chat-realtime.service';
import { ConversationViewAssembler } from './conversation-view.assembler';

/**
 * 会话变更通知器。
 * 会话被创建/成员变更/客服接入时，向相关用户推送其专属会话视图（含各自未读数），
 * 使客户端无需轮询即可刷新会话列表。
 */
@Injectable()
export class ConversationNotifier {
  constructor(
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly assembler: ConversationViewAssembler,
    private readonly realtime: ChatRealtimeService,
  ) {}

  /** 向指定用户（默认全体成员）推送会话视图 */
  async pushToMembers(
    conversation: ConversationEntity,
    userIds?: string[],
  ): Promise<void> {
    const targets =
      userIds ??
      (await this.members.findByConversation(conversation.id)).map(
        (m) => m.userId,
      );
    await Promise.all(
      targets.map(async (userId) => {
        const view = await this.assembler.toView(conversation, userId);
        this.realtime.emitToUser(userId, IM_EVENTS.conversation, view);
      }),
    );
  }
}
