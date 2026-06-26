import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ConversationMemberRole,
  ConversationType,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../../domain/conversation-member-repository.interface';
import { ConversationAccessService } from '../conversation-access.service';
import { ConversationNotifier } from '../conversation-notifier.service';
import { SystemMessageService } from '../system-message.service';

/** 用例：将成员移出群聊（需管理权，不能移出群主） */
@Injectable()
export class RemoveMemberUseCase {
  constructor(
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly users: UserDirectory,
    private readonly access: ConversationAccessService,
    private readonly notifier: ConversationNotifier,
    private readonly systemMessage: SystemMessageService,
  ) {}

  async execute(
    conversationId: string,
    operatorId: string,
    targetId: string,
  ): Promise<void> {
    await this.access.assertManager(conversationId, operatorId);
    const conversation =
      await this.access.getConversationOrFail(conversationId);
    if (conversation.type !== ConversationType.Group) {
      throw new BadRequestException('仅群聊支持移出成员');
    }
    const target = await this.members.findOne(conversationId, targetId);
    if (!target) {
      throw new BadRequestException('该用户不在群中');
    }
    if (target.role === ConversationMemberRole.Owner) {
      throw new BadRequestException('不能移出群主');
    }

    await this.members.remove(conversationId, targetId);
    const names = await this.users.resolveNames([targetId]);
    await this.systemMessage.post(
      conversationId,
      `${names.get(targetId) ?? targetId} 被移出群聊`,
    );
    await this.notifier.pushToMembers(conversation);
  }
}
