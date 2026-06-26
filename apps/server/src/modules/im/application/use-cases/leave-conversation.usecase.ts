import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConversationMemberRole, ConversationType } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../../domain/conversation-member-repository.interface';
import { ConversationAccessService } from '../conversation-access.service';
import { ConversationNotifier } from '../conversation-notifier.service';
import { SystemMessageService } from '../system-message.service';

/** 用例：主动退出会话（群主需先转让，此处禁止群主直接退群） */
@Injectable()
export class LeaveConversationUseCase {
  constructor(
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly users: UserDirectory,
    private readonly access: ConversationAccessService,
    private readonly notifier: ConversationNotifier,
    private readonly systemMessage: SystemMessageService,
  ) {}

  async execute(conversationId: string, userId: string): Promise<void> {
    const member = await this.access.assertMember(conversationId, userId);
    const conversation =
      await this.access.getConversationOrFail(conversationId);
    if (
      conversation.type === ConversationType.Group &&
      member.role === ConversationMemberRole.Owner
    ) {
      throw new BadRequestException('群主不能直接退出群聊');
    }

    await this.members.remove(conversationId, userId);
    if (conversation.type === ConversationType.Group) {
      const names = await this.users.resolveNames([userId]);
      await this.systemMessage.post(
        conversationId,
        `${names.get(userId) ?? userId} 退出了群聊`,
      );
    }
    await this.notifier.pushToMembers(conversation);
  }
}
