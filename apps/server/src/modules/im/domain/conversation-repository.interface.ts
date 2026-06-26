import { ConversationEntity } from './conversation.entity';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

/** 会话仓储端口 */
export interface ConversationRepository {
  save(conversation: ConversationEntity): Promise<ConversationEntity>;
  findById(id: string): Promise<ConversationEntity | null>;
  findByIds(ids: string[]): Promise<ConversationEntity[]>;
  /** 待接入的客服会话，按发起先后排序（先到先服务） */
  findWaitingService(): Promise<ConversationEntity[]>;
}
