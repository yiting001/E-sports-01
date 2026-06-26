import { MessageType } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';

/**
 * 聊天消息实体。
 * 仅持久化与契约一致的必要字段，避免冗余；
 * 会话维度用 conversationId 表达，群聊/客服等会话类型在上层语义中区分。
 */
@Entity('sys_chat_message')
export class ChatMessageEntity extends BaseEntity {
  @Index()
  @Column({ length: 64 })
  conversationId!: string;

  @Index()
  @Column({ length: 36 })
  senderId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: MessageType;

  @Column({ type: 'text' })
  content!: string;
}
