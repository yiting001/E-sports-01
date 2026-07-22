import { ConversationEntity } from './conversation.entity';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

/** 会话仓储端口 */
export interface ConversationRepository {
  save(conversation: ConversationEntity): Promise<ConversationEntity>;
  findById(id: string): Promise<ConversationEntity | null>;
  findByIds(ids: string[]): Promise<ConversationEntity[]>;
  /** 实体版本仍匹配时才窄写标题，竞争或 ABA 变化返回 null。 */
  compareAndSetTitle(
    id: string,
    expectedVersion: number,
    nextTitle: string,
  ): Promise<ConversationEntity | null>;
  /** 待接入的客服会话，按发起先后排序（先到先服务） */
  findWaitingService(): Promise<ConversationEntity[]>;
}
