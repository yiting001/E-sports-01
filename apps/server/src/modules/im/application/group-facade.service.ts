import { Inject, Injectable } from '@nestjs/common';
import {
  ConversationMemberRole,
  ConversationStatus,
  ConversationType,
} from '@app/contracts';
import { ConversationEntity } from '../domain/conversation.entity';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../domain/conversation-repository.interface';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../domain/conversation-member-repository.interface';
import { buildMember } from './member.factory';
import { ConversationNotifier } from './conversation-notifier.service';
import { SystemMessageService } from './system-message.service';

/**
 * 群聊系统操作门面（供业务模块调用的最小写口）。
 * 与用户主动建群/加人用例不同：由系统流程（如订单支付成功自动拉群、
 * 打手接单自动进群）触发，不做操作者管理权校验，成员构成由调用方决定。
 */
@Injectable()
export class GroupFacade {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly notifier: ConversationNotifier,
    private readonly systemMessage: SystemMessageService,
  ) {}

  /** 创建群聊并落成员（ownerId 为群主，其余为普通成员），返回会话 id */
  async createGroup(
    ownerId: string,
    title: string,
    memberIds: string[],
    welcomeText?: string,
  ): Promise<string> {
    const ids = [...new Set([ownerId, ...memberIds].filter(Boolean))];
    const conversation = new ConversationEntity();
    conversation.type = ConversationType.Group;
    conversation.title = title;
    conversation.ownerId = ownerId;
    conversation.status = ConversationStatus.Active;
    const saved = await this.conversations.save(conversation);

    const rows = ids.map((userId) =>
      buildMember(
        saved.id,
        userId,
        userId === ownerId
          ? ConversationMemberRole.Owner
          : ConversationMemberRole.Member,
      ),
    );
    await this.members.saveMany(rows);
    if (welcomeText) {
      await this.systemMessage.post(saved.id, welcomeText);
    }
    await this.notifier.pushToMembers(saved, ids);
    return saved.id;
  }

  /** 幂等地把用户加入群聊（已在群则跳过），可附带系统提示消息 */
  async joinGroup(
    conversationId: string,
    userId: string,
    noticeText?: string,
  ): Promise<void> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      return;
    }
    const existing = await this.members.findByConversation(conversationId);
    if (!existing.some((m) => m.userId === userId)) {
      await this.members.saveMany([
        buildMember(conversationId, userId, ConversationMemberRole.Member),
      ]);
    }
    if (noticeText) {
      await this.systemMessage.post(conversationId, noticeText);
    }
    await this.notifier.pushToMembers(conversation);
  }
}
