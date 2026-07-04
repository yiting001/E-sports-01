import { NOTICE_LIMITS } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 通知公告聚合根。
 * 管理端维护，C 端首页公告条滚动展示启用中的通知，点击查看富文本详情。
 */
@Entity('notice')
export class NoticeEntity extends TenantScopedEntity {
  /** 标题（公告条滚动展示） */
  @Column({ length: NOTICE_LIMITS.titleMax })
  title!: string;

  /** 详情（富文本 HTML） */
  @Column({ type: 'text' })
  content!: string;

  /** 是否启用（仅启用的通知对 C 端可见） */
  @Index()
  @Column({ default: true })
  enabled!: boolean;

  /** 排序权重，越小越靠前 */
  @Column({ type: 'int', default: 0 })
  sort!: number;
}
