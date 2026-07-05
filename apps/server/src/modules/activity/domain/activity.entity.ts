import { ACTIVITY_LIMITS } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 福利活动聚合根。
 * 管理端发布运营活动（封面/富文本详情/起止时间），
 * C 端「福利活动」列表仅展示启用且在起止时间内的活动。
 */
@Entity('activity')
export class ActivityEntity extends TenantScopedEntity {
  /** 活动标题 */
  @Column({ length: ACTIVITY_LIMITS.titleMax })
  title!: string;

  /** 封面图 URL（可为空串，列表回退纯文字卡片） */
  @Column({ length: ACTIVITY_LIMITS.coverMax, default: '' })
  cover!: string;

  /** 活动详情（富文本 HTML） */
  @Column({ type: 'text' })
  content!: string;

  /** 活动开始 */
  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt!: Date;

  /** 活动结束 */
  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt!: Date;

  /** 是否启用（仅启用且进行中的活动对 C 端可见） */
  @Index()
  @Column({ default: true })
  enabled!: boolean;

  /** 排序权重，越小越靠前 */
  @Column({ type: 'int', default: 0 })
  sort!: number;
}
