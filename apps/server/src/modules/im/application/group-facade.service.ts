import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConversationMemberRole, ConversationStatus, ConversationType } from '@app/contracts';
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
  private readonly logger = new Logger(GroupFacade.name);

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
        userId === ownerId ? ConversationMemberRole.Owner : ConversationMemberRole.Member,
      ),
    );
    await this.members.saveMany(rows);
    if (welcomeText) {
      await this.systemMessage.post(saved.id, welcomeText);
    }
    await this.notifier.pushToMembers(saved, ids);
    return saved.id;
  }

  /**
   * 幂等确保业务系统群存在。业务方提供稳定 UUID，重试时复用同一会话并补齐成员；
   * 欢迎消息与实时通知属于提交后副作用，失败不影响已经创建的群主体。
   */
  async ensureSystemGroup(
    conversationId: string,
    ownerId: string,
    title: string,
    memberIds: string[],
    welcomeText?: string,
  ): Promise<string> {
    const ids = [...new Set([ownerId, ...memberIds].filter(Boolean))];
    const { conversation, created } = await this.findOrCreateSystemGroup(
      conversationId,
      ownerId,
      title,
    );
    const addedMembers = await this.ensureMembers(
      conversation.id,
      conversation.ownerId ?? ownerId,
      ids,
    );
    if (created && welcomeText) {
      await this.postWelcomeSafely(conversation.id, welcomeText);
    }
    if (created || addedMembers) {
      await this.notifySafely(conversation, ids);
    }
    return conversation.id;
  }

  /** 幂等地把用户加入群聊（已在群则跳过），可附带系统提示消息 */
  async joinGroup(conversationId: string, userId: string, noticeText?: string): Promise<void> {
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

  private async findOrCreateSystemGroup(
    conversationId: string,
    ownerId: string,
    title: string,
  ): Promise<{ conversation: ConversationEntity; created: boolean }> {
    const existing = await this.conversations.findById(conversationId);
    if (existing) {
      this.assertSystemGroup(existing);
      return { conversation: existing, created: false };
    }

    const conversation = new ConversationEntity();
    conversation.id = conversationId;
    conversation.type = ConversationType.Group;
    conversation.title = title;
    conversation.ownerId = ownerId;
    conversation.status = ConversationStatus.Active;
    try {
      return {
        conversation: await this.conversations.save(conversation),
        created: true,
      };
    } catch (error) {
      const raced = await this.conversations.findById(conversationId);
      if (!raced) {
        throw error;
      }
      this.assertSystemGroup(raced);
      return { conversation: raced, created: false };
    }
  }

  private assertSystemGroup(conversation: ConversationEntity): void {
    if (conversation.type !== ConversationType.Group) {
      throw new Error(`系统群会话 ID ${conversation.id} 已被非群聊会话占用`);
    }
  }

  private async ensureMembers(
    conversationId: string,
    ownerId: string,
    userIds: string[],
  ): Promise<boolean> {
    const existing = await this.members.findByConversation(conversationId);
    const existingIds = new Set(existing.map((member) => member.userId));
    const missing = userIds.filter((userId) => !existingIds.has(userId));
    if (missing.length === 0) {
      return false;
    }
    try {
      await this.members.saveMany(
        missing.map((userId) =>
          buildMember(
            conversationId,
            userId,
            userId === ownerId ? ConversationMemberRole.Owner : ConversationMemberRole.Member,
          ),
        ),
      );
      return true;
    } catch (error) {
      const afterConflict = await this.members.findByConversation(conversationId);
      const savedIds = new Set(afterConflict.map((member) => member.userId));
      if (!userIds.every((userId) => savedIds.has(userId))) {
        throw error;
      }
      return false;
    }
  }

  private async postWelcomeSafely(conversationId: string, welcomeText: string): Promise<void> {
    try {
      await this.systemMessage.post(conversationId, welcomeText);
    } catch (error) {
      this.logger.error(
        `系统群 ${conversationId} 欢迎消息发送失败`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async notifySafely(conversation: ConversationEntity, userIds: string[]): Promise<void> {
    try {
      await this.notifier.pushToMembers(conversation, userIds);
    } catch (error) {
      this.logger.error(
        `系统群 ${conversation.id} 实时通知失败`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
