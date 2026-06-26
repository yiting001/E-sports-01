import { ChatMessageEntity } from './message.entity';

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');

/** 聊天消息仓储端口，隔离领域与持久化实现 */
export interface MessageRepository {
  save(message: ChatMessageEntity): Promise<ChatMessageEntity>;
  findRecent(conversationId: string, limit: number): Promise<ChatMessageEntity[]>;
  /** 会话最后一条消息，供会话列表预览 */
  findLatest(conversationId: string): Promise<ChatMessageEntity | null>;
  /** 某时间点之后的消息条数，供未读数计算（since 为空表示统计全部） */
  countSince(conversationId: string, since: Date | null): Promise<number>;
}
