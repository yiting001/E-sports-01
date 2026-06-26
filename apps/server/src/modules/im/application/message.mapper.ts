import { ChatMessage } from '@app/contracts';
import { ChatMessageEntity } from '../domain/message.entity';

/** 实体 → 对外消息体，时间统一为毫秒时间戳与契约对齐 */
export function toChatMessage(entity: ChatMessageEntity): ChatMessage {
  return {
    id: entity.id,
    conversationId: entity.conversationId,
    senderId: entity.senderId,
    type: entity.type,
    content: entity.content,
    createdAt: entity.createdAt.getTime(),
  };
}
