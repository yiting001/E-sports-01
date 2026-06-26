import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConversationStatus, ConversationType } from '@app/contracts';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../../domain/conversation-repository.interface';
import { ConversationAccessService } from '../conversation-access.service';
import { ConversationNotifier } from '../conversation-notifier.service';
import { SystemMessageService } from '../system-message.service';

/** 用例：结束客服会话（由接入坐席操作） */
@Injectable()
export class CloseServiceUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    private readonly access: ConversationAccessService,
    private readonly systemMessage: SystemMessageService,
    private readonly notifier: ConversationNotifier,
  ) {}

  async execute(conversationId: string, operatorId: string): Promise<void> {
    const conversation =
      await this.access.getConversationOrFail(conversationId);
    if (conversation.type !== ConversationType.Service) {
      throw new BadRequestException('该会话不是客服会话');
    }
    await this.access.assertMember(conversationId, operatorId);
    if (conversation.status === ConversationStatus.Closed) {
      throw new BadRequestException('该客服会话已结束');
    }
    conversation.status = ConversationStatus.Closed;
    const saved = await this.conversations.save(conversation);
    await this.systemMessage.post(conversationId, '客服会话已结束');
    await this.notifier.pushToMembers(saved);
  }
}
