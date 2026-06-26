import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  ConversationMemberRole,
  ConversationStatus,
  ConversationType,
  ConversationView,
  CreateGroupPayload,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
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

/** 群聊最大成员数兜底值，正式取值来自配置中心 */
const FALLBACK_MAX_MEMBERS = 100;

/** 用例：创建群聊，创建者为群主，其余为普通成员 */
@Injectable()
export class CreateGroupUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly config: ConfigService,
    private readonly users: UserDirectory,
    private readonly assembler: ConversationViewAssembler,
    private readonly notifier: ConversationNotifier,
  ) {}

  async execute(
    ownerId: string,
    payload: CreateGroupPayload,
  ): Promise<ConversationView> {
    const title = payload?.title?.trim();
    if (!title) {
      throw new BadRequestException('群名称不能为空');
    }
    const memberIds = await this.resolveMembers(ownerId, payload.memberIds);

    const conversation = await this.conversations.save(
      this.newGroup(ownerId, title),
    );
    const rows = memberIds.map((userId) =>
      buildMember(
        conversation.id,
        userId,
        userId === ownerId
          ? ConversationMemberRole.Owner
          : ConversationMemberRole.Member,
      ),
    );
    await this.members.saveMany(rows);
    await this.notifier.pushToMembers(conversation, memberIds);
    return this.assembler.toView(conversation, ownerId);
  }

  /** 去重、并入群主、校验成员存在与人数上限 */
  private async resolveMembers(
    ownerId: string,
    requested: string[],
  ): Promise<string[]> {
    const ids = [...new Set([ownerId, ...(requested ?? [])].filter(Boolean))];
    const max = await this.config.getNumber(
      CONFIG_KEYS.im.groupMaxMembers,
      FALLBACK_MAX_MEMBERS,
    );
    if (ids.length > max) {
      throw new BadRequestException(`群成员数不能超过 ${max}`);
    }
    const briefs = await this.users.findBriefs(ids);
    if (briefs.length !== ids.length) {
      throw new BadRequestException('存在无效的成员用户');
    }
    return ids;
  }

  private newGroup(ownerId: string, title: string): ConversationEntity {
    const conversation = new ConversationEntity();
    conversation.type = ConversationType.Group;
    conversation.title = title;
    conversation.ownerId = ownerId;
    conversation.status = ConversationStatus.Active;
    return conversation;
  }
}
