import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationMemberRole } from '@app/contracts';
import { ConversationEntity } from '../domain/conversation.entity';
import { ConversationMemberEntity } from '../domain/conversation-member.entity';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../domain/conversation-repository.interface';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../domain/conversation-member-repository.interface';

/** 可管理会话（增删成员、改名）的角色集合 */
const MANAGER_ROLES: ConversationMemberRole[] = [
  ConversationMemberRole.Owner,
  ConversationMemberRole.Admin,
];

/**
 * 会话访问校验服务。
 * 收敛「会话是否存在」「用户是否成员」「是否有管理权」等鉴权判断，
 * 供各用例复用，避免散落重复的校验逻辑。
 */
@Injectable()
export class ConversationAccessService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
  ) {}

  async getConversationOrFail(id: string): Promise<ConversationEntity> {
    const conversation = await this.conversations.findById(id);
    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }
    return conversation;
  }

  /** 校验用户为会话成员，返回其成员记录 */
  async assertMember(
    conversationId: string,
    userId: string,
  ): Promise<ConversationMemberEntity> {
    const member = await this.members.findOne(conversationId, userId);
    if (!member) {
      throw new ForbiddenException('你不是该会话成员');
    }
    return member;
  }

  /** 校验用户具备会话管理权（群主或管理员） */
  async assertManager(
    conversationId: string,
    userId: string,
  ): Promise<ConversationMemberEntity> {
    const member = await this.assertMember(conversationId, userId);
    if (!MANAGER_ROLES.includes(member.role)) {
      throw new ForbiddenException('需要群主或管理员权限');
    }
    return member;
  }
}
