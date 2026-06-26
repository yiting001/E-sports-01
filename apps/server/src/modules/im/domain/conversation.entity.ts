import { ConversationStatus, ConversationType } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';

/**
 * 会话实体（聚合根）。
 * 私聊 / 群聊 / 客服共用同一张表，靠 type 与 status 区分语义与状态机：
 * 群聊恒为 active；客服走 pending → active → closed。
 */
@Entity('sys_conversation')
export class ConversationEntity extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 16 })
  type!: ConversationType;

  @Column({ length: 128, default: '' })
  title!: string;

  /** 群主 / 客服会话的发起访客；私聊为空 */
  @Column({ name: 'owner_id', type: 'varchar', length: 36, nullable: true })
  ownerId!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 16, default: ConversationStatus.Active })
  status!: ConversationStatus;

  /** 客服会话冗余主题，便于队列展示，避免再查消息 */
  @Column({ length: 128, default: '' })
  subject!: string;
}
