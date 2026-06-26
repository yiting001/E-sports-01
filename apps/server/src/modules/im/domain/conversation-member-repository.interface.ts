import { ConversationMemberEntity } from './conversation-member.entity';

export const CONVERSATION_MEMBER_REPOSITORY = Symbol(
  'CONVERSATION_MEMBER_REPOSITORY',
);

/** 会话成员仓储端口 */
export interface ConversationMemberRepository {
  saveMany(
    members: ConversationMemberEntity[],
  ): Promise<ConversationMemberEntity[]>;
  findByConversation(conversationId: string): Promise<ConversationMemberEntity[]>;
  findByUser(userId: string): Promise<ConversationMemberEntity[]>;
  findOne(
    conversationId: string,
    userId: string,
  ): Promise<ConversationMemberEntity | null>;
  countByConversation(conversationId: string): Promise<number>;
  remove(conversationId: string, userId: string): Promise<void>;
  updateLastRead(
    conversationId: string,
    userId: string,
    at: Date,
  ): Promise<void>;
}
