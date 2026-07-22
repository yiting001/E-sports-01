import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../../domain/conversation-member-repository.interface';
import { MESSAGE_REPOSITORY, MessageRepository } from '../../domain/message-repository.interface';

/** 用例：把会话已读位点单调推进到客户端最后确认可见的消息时间。 */
@Injectable()
export class MarkReadUseCase {
  constructor(
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messages: MessageRepository,
  ) {}

  async execute(conversationId: string, userId: string, messageId: string): Promise<void> {
    const [member, message] = await Promise.all([
      this.members.findOne(conversationId, userId),
      this.messages.findById(messageId),
    ]);
    if (!member) {
      return;
    }
    if (!message || message.conversationId !== conversationId) {
      throw new BadRequestException('已读消息不属于当前会话');
    }
    await this.members.updateLastRead(conversationId, userId, message.createdAt);
  }
}
