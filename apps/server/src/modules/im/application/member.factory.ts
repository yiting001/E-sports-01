import { ConversationMemberRole } from '@app/contracts';
import { ConversationMemberEntity } from '../domain/conversation-member.entity';

/** 构造会话成员实体，集中默认字段，避免各处重复 new */
export function buildMember(
  conversationId: string,
  userId: string,
  role: ConversationMemberRole,
): ConversationMemberEntity {
  const member = new ConversationMemberEntity();
  member.conversationId = conversationId;
  member.userId = userId;
  member.role = role;
  member.lastReadAt = null;
  return member;
}
