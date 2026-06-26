import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ConversationMemberRole,
  ConversationStatus,
  ConversationType,
  ConversationView,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { ConversationEntity } from '../../domain/conversation.entity';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../../domain/conversation-repository.interface';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../../domain/conversation-member-repository.interface';
import { buildMember } from '../member.factory';
import { ConversationViewAssembler } from '../conversation-view.assembler';
import { ConversationNotifier } from '../conversation-notifier.service';

/** 用例：打开与某用户的私聊，存在则复用，否则创建（保证两人间唯一） */
@Injectable()
export class OpenPrivateUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly users: UserDirectory,
    private readonly assembler: ConversationViewAssembler,
    private readonly notifier: ConversationNotifier,
  ) {}

  async execute(userId: string, peerId: string): Promise<ConversationView> {
    if (!peerId || peerId === userId) {
      throw new BadRequestException('请选择有效的聊天对象');
    }
    const briefs = await this.users.findBriefs([peerId]);
    if (briefs.length === 0) {
      throw new BadRequestException('聊天对象不存在');
    }

    const existing = await this.findExisting(userId, peerId);
    if (existing) {
      return this.assembler.toView(existing, userId);
    }

    const conversation = await this.conversations.save(this.newPrivate(userId));
    await this.members.saveMany([
      buildMember(conversation.id, userId, ConversationMemberRole.Member),
      buildMember(conversation.id, peerId, ConversationMemberRole.Member),
    ]);
    await this.notifier.pushToMembers(conversation, [userId, peerId]);
    return this.assembler.toView(conversation, userId);
  }

  /** 查找两人间已存在的私聊会话 */
  private async findExisting(
    userId: string,
    peerId: string,
  ): Promise<ConversationEntity | null> {
    const mine = await this.members.findByUser(userId);
    const candidates = await this.conversations.findByIds(
      mine.map((m) => m.conversationId),
    );
    for (const conversation of candidates) {
      if (conversation.type !== ConversationType.Private) {
        continue;
      }
      const peer = await this.members.findOne(conversation.id, peerId);
      if (peer) {
        return conversation;
      }
    }
    return null;
  }

  private newPrivate(userId: string): ConversationEntity {
    const conversation = new ConversationEntity();
    conversation.type = ConversationType.Private;
    conversation.title = '';
    conversation.ownerId = userId;
    conversation.status = ConversationStatus.Active;
    return conversation;
  }
}
