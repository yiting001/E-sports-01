import { Inject, Injectable } from '@nestjs/common';
import { ConversationView } from '@app/contracts';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../../domain/conversation-repository.interface';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../../domain/conversation-member-repository.interface';
import { ConversationViewAssembler } from '../conversation-view.assembler';

/** 用例：列出我参与的所有会话，按最近活跃排序 */
@Injectable()
export class ListConversationsUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly assembler: ConversationViewAssembler,
  ) {}

  async execute(userId: string): Promise<ConversationView[]> {
    const memberships = await this.members.findByUser(userId);
    const conversations = await this.conversations.findByIds(
      memberships.map((m) => m.conversationId),
    );
    const views = await Promise.all(
      conversations.map((c) => this.assembler.toView(c, userId)),
    );
    return views.sort(
      (a, b) => this.activeAt(b) - this.activeAt(a),
    );
  }

  /** 排序依据：最后一条消息时间，无消息则退回会话更新时间 */
  private activeAt(view: ConversationView): number {
    return view.lastMessage?.createdAt ?? view.updatedAt;
  }
}
