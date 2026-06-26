import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ConversationType,
  ConversationView,
  RenameGroupPayload,
} from '@app/contracts';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../../domain/conversation-repository.interface';
import { Inject } from '@nestjs/common';
import { ConversationAccessService } from '../conversation-access.service';
import { ConversationViewAssembler } from '../conversation-view.assembler';
import { ConversationNotifier } from '../conversation-notifier.service';
import { SystemMessageService } from '../system-message.service';

/** 用例：群聊改名（需管理权），并广播改名系统消息 */
@Injectable()
export class RenameGroupUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    private readonly access: ConversationAccessService,
    private readonly assembler: ConversationViewAssembler,
    private readonly notifier: ConversationNotifier,
    private readonly systemMessage: SystemMessageService,
  ) {}

  async execute(
    conversationId: string,
    operatorId: string,
    payload: RenameGroupPayload,
  ): Promise<ConversationView> {
    const title = payload?.title?.trim();
    if (!title) {
      throw new BadRequestException('群名称不能为空');
    }
    await this.access.assertManager(conversationId, operatorId);
    const conversation =
      await this.access.getConversationOrFail(conversationId);
    if (conversation.type !== ConversationType.Group) {
      throw new BadRequestException('仅群聊支持改名');
    }

    conversation.title = title;
    const saved = await this.conversations.save(conversation);
    await this.systemMessage.post(conversationId, `群名称已改为「${title}」`);
    await this.notifier.pushToMembers(saved);
    return this.assembler.toView(saved, operatorId);
  }
}
