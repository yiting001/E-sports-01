import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  AddMembersPayload,
  CONFIG_KEYS,
  ConversationDetailView,
  ConversationMemberRole,
  ConversationType,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../../domain/conversation-member-repository.interface';
import { buildMember } from '../member.factory';
import { ConversationAccessService } from '../conversation-access.service';
import { ConversationViewAssembler } from '../conversation-view.assembler';
import { ConversationNotifier } from '../conversation-notifier.service';
import { SystemMessageService } from '../system-message.service';

/** 群聊最大成员数兜底值，正式取值来自配置中心 */
const FALLBACK_MAX_MEMBERS = 100;

/** 用例：向群聊添加成员（需管理权），并广播加入系统消息 */
@Injectable()
export class AddMembersUseCase {
  constructor(
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly config: ConfigService,
    private readonly users: UserDirectory,
    private readonly access: ConversationAccessService,
    private readonly assembler: ConversationViewAssembler,
    private readonly notifier: ConversationNotifier,
    private readonly systemMessage: SystemMessageService,
  ) {}

  async execute(
    conversationId: string,
    operatorId: string,
    payload: AddMembersPayload,
  ): Promise<ConversationDetailView> {
    await this.access.assertManager(conversationId, operatorId);
    const conversation =
      await this.access.getConversationOrFail(conversationId);
    if (conversation.type !== ConversationType.Group) {
      throw new BadRequestException('仅群聊支持添加成员');
    }

    const additions = await this.resolveAdditions(
      conversationId,
      payload?.userIds ?? [],
    );
    const rows = additions.map((b) =>
      buildMember(conversationId, b.id, ConversationMemberRole.Member),
    );
    await this.members.saveMany(rows);

    await this.systemMessage.post(
      conversationId,
      `${additions.map((b) => b.username).join('、')} 加入了群聊`,
    );
    await this.notifier.pushToMembers(conversation);
    return this.assembler.toDetail(conversation, operatorId);
  }

  /** 过滤已在群者、校验存在性、校验人数上限 */
  private async resolveAdditions(
    conversationId: string,
    requested: string[],
  ): Promise<{ id: string; username: string }[]> {
    const ids = [...new Set(requested.filter(Boolean))];
    if (ids.length === 0) {
      throw new BadRequestException('请选择要添加的成员');
    }
    const briefs = await this.users.findBriefs(ids);
    if (briefs.length !== ids.length) {
      throw new BadRequestException('存在无效的成员用户');
    }
    const existing = await this.members.findByConversation(conversationId);
    const existingIds = new Set(existing.map((m) => m.userId));
    const additions = briefs.filter((b) => !existingIds.has(b.id));
    if (additions.length === 0) {
      throw new BadRequestException('所选用户均已在群中');
    }
    const max = await this.config.getNumber(
      CONFIG_KEYS.im.groupMaxMembers,
      FALLBACK_MAX_MEMBERS,
    );
    if (existing.length + additions.length > max) {
      throw new BadRequestException(`群成员数不能超过 ${max}`);
    }
    return additions;
  }
}
