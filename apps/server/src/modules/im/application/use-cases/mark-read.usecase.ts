import { Inject, Injectable } from '@nestjs/common';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../../domain/conversation-member-repository.interface';

/** 用例：把会话的已读位点推进到当前时间（进入会话/查看时调用） */
@Injectable()
export class MarkReadUseCase {
  constructor(
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
  ) {}

  async execute(conversationId: string, userId: string): Promise<void> {
    const member = await this.members.findOne(conversationId, userId);
    if (!member) {
      return;
    }
    await this.members.updateLastRead(conversationId, userId, new Date());
  }
}
