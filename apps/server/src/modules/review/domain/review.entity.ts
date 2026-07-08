import { REVIEW_LIMITS } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 商品评论聚合根。
 * 用户对本人「已完成」订单发表的评分 + 文字评论，一单一评（orderId 唯一）；
 * 营销评论（管理端添加）无订单，orderId 为 NULL（唯一索引允许多个 NULL），
 * 自定义 reviewerName/avatar 展示；
 * 固化订单号/商品标题快照，商品改名不影响历史评论；
 * visible 控制对外展示，管理端可隐藏违规评论（软隐藏，非删除）。
 */
@Entity('product_review')
export class ReviewEntity extends TenantScopedEntity {
  /** 评论人用户 id；营销评论为空串 */
  @Index()
  @Column({ name: 'user_id', length: 36, default: '' })
  userId!: string;

  /** 被评价订单 id（一单一评的幂等键）；营销评论为 NULL */
  @Index({ unique: true })
  @Column({ name: 'order_id', type: 'varchar', length: 36, nullable: true })
  orderId!: string | null;

  /** 商户订单号快照；营销评论为空串 */
  @Column({ name: 'order_no', length: 64, default: '' })
  orderNo!: string;

  /** 商品 id（商品详情页按此聚合展示） */
  @Index()
  @Column({ name: 'product_id', length: 36 })
  productId!: string;

  /** 商品标题快照（评论时固化） */
  @Column({ name: 'product_title', length: 128 })
  productTitle!: string;

  /** 星级评分（1-5） */
  @Column({ type: 'int' })
  rating!: number;

  /** 评论内容 */
  @Column({ length: REVIEW_LIMITS.contentMax })
  content!: string;

  /** 营销评论自定义展示昵称；真实用户评论为空串（展示时取脱敏昵称） */
  @Column({ name: 'reviewer_name', length: REVIEW_LIMITS.reviewerNameMax, default: '' })
  reviewerName!: string;

  /** 营销评论自定义头像 URL；空串由前端展示默认头像 */
  @Column({ length: REVIEW_LIMITS.avatarMax, default: '' })
  avatar!: string;

  /** 是否对外可见（管理端隐藏后为 false） */
  @Column({ default: true })
  visible!: boolean;
}
