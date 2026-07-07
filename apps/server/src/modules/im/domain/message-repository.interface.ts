import { ChatMessageEntity } from './message.entity';

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');

/** 聊天记录搜索条件（关键词与日期范围均可选，分页必填） */
export interface MessageSearchFilter {
  conversationId: string;
  /** 内容关键词（模糊匹配，忽略大小写） */
  keyword?: string;
  /** 起始时间（含） */
  from?: Date;
  /** 截止时间（含） */
  to?: Date;
  skip: number;
  take: number;
}

/** 聊天消息仓储端口，隔离领域与持久化实现 */
export interface MessageRepository {
  save(message: ChatMessageEntity): Promise<ChatMessageEntity>;
  findRecent(conversationId: string, limit: number): Promise<ChatMessageEntity[]>;
  /** 会话最后一条消息，供会话列表预览 */
  findLatest(conversationId: string): Promise<ChatMessageEntity | null>;
  /** 某时间点之后的消息条数，供未读数计算（since 为空表示统计全部） */
  countSince(conversationId: string, since: Date | null): Promise<number>;
  /** 按关键词/日期范围搜索会话内消息（新→旧分页返回） */
  search(
    filter: MessageSearchFilter,
  ): Promise<{ rows: ChatMessageEntity[]; total: number }>;
}
