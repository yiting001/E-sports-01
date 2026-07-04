import { FeedbackStatus, FeedbackType } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 反馈/投诉聚合根。
 * 用户对客服/打手等对象提交的投诉反馈；
 * 状态机：pending →（管理员处理并回复）→ resolved。
 */
@Entity('feedback')
export class FeedbackEntity extends TenantScopedEntity {
  /** 提交人用户 id */
  @Index()
  @Column({ length: 36 })
  userId!: string;

  /** 反馈类型（投诉打手 / 投诉客服 / 其他） */
  @Column({ type: 'varchar', length: 16 })
  type!: FeedbackType;

  /** 被投诉对象（昵称/单号等线索）；可空为空串 */
  @Column({ length: 64, default: '' })
  target!: string;

  /** 反馈内容 */
  @Column({ length: 500 })
  content!: string;

  @Column({ type: 'varchar', length: 16, default: FeedbackStatus.Pending })
  status!: FeedbackStatus;

  /** 处理回复；未处理为空串 */
  @Column({ name: 'reply_content', length: 500, default: '' })
  replyContent!: string;

  /** 处理人用户 id；未处理为空串 */
  @Column({ name: 'handled_by', length: 36, default: '' })
  handledBy!: string;

  /** 处理时间；未处理为 null */
  @Column({ name: 'handled_at', type: 'timestamptz', nullable: true })
  handledAt!: Date | null;
}
