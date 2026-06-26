import { ChatMessageEntity } from './message.entity';

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');

/** 聊天消息仓储端口，隔离领域与持久化实现 */
export interface MessageRepository {
  save(message: ChatMessageEntity): Promise<ChatMessageEntity>;
  findRecent(conversationId: string, limit: number): Promise<ChatMessageEntity[]>;
}
