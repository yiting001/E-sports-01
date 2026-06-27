import { ConversationMemberRole } from '@app/contracts';
import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 会话成员实体。
 * 表达「会话-用户-角色」关系并记录已读位点（lastReadAt）用于未读数计算。
 * (conversationId, userId) 唯一，防止重复入会。
 */
@Entity('sys_conversation_member')
@Unique(['conversationId', 'userId'])
export class ConversationMemberEntity extends TenantScopedEntity {
  @Index()
  @Column({ name: 'conversation_id', length: 36 })
  conversationId!: string;

  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  role!: ConversationMemberRole;

  /** 该成员最后读到的时间点，用于计算未读数 */
  @Column({ name: 'last_read_at', type: 'timestamptz', nullable: true })
  lastReadAt!: Date | null;
}
