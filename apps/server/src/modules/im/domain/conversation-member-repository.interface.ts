import { ConversationMemberEntity } from './conversation-member.entity';

export const CONVERSATION_MEMBER_REPOSITORY = Symbol('CONVERSATION_MEMBER_REPOSITORY');

/** 会话成员仓储端口 */
export interface ConversationMemberRepository {
  saveMany(members: ConversationMemberEntity[]): Promise<ConversationMemberEntity[]>;
  findByConversation(conversationId: string): Promise<ConversationMemberEntity[]>;
  findByUser(userId: string): Promise<ConversationMemberEntity[]>;
  findOne(conversationId: string, userId: string): Promise<ConversationMemberEntity | null>;
  countByConversation(conversationId: string): Promise<number>;
  remove(conversationId: string, userId: string): Promise<void>;
  /** 使用数据库内目标消息时间推进位点，避免 JS Date 丢失 PostgreSQL 微秒精度。 */
  updateLastReadToMessage(
    conversationId: string,
    userId: string,
    messageId: string,
  ): Promise<void>;
}
