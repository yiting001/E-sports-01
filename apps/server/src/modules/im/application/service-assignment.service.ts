import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  ConversationMemberRole,
  ConversationStatus,
} from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import { UserDirectory } from '../../rbac/application/user-directory.service';
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
 * 客服接入服务。
 * 收敛「坐席接入一通客服会话」的公共流程，供自动分配 / 主动认领 / 管理员指派复用：
 * 校验状态 → 入会为坐席 → 置为进行中 → 发系统提示与欢迎语 → 推送会话。
 */
@Injectable()
export class ServiceAssignmentService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly config: ConfigService,
    private readonly users: UserDirectory,
    private readonly notifier: ConversationNotifier,
    private readonly systemMessage: SystemMessageService,
  ) {}

  async attachAgent(
    conversation: ConversationEntity,
    agentId: string,
  ): Promise<void> {
    if (conversation.status !== ConversationStatus.Pending) {
      throw new BadRequestException('该客服会话已被接入或已结束');
    }
    const existing = await this.members.findOne(conversation.id, agentId);
    if (!existing) {
      await this.members.saveMany([
        buildMember(conversation.id, agentId, ConversationMemberRole.Agent),
      ]);
    }
    conversation.status = ConversationStatus.Active;
    const saved = await this.conversations.save(conversation);

    const names = await this.users.resolveNames([agentId]);
    await this.systemMessage.post(
      conversation.id,
      `客服 ${names.get(agentId) ?? agentId} 已接入`,
    );
    const welcome = (
      await this.config.getString(CONFIG_KEYS.im.serviceWelcome, '')
    ).trim();
    if (welcome) {
      await this.systemMessage.post(conversation.id, welcome);
    }
    await this.notifier.pushToMembers(saved);
  }
}
