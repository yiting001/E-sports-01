import { COUPON_LIMITS } from '@app/contracts';
import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 优惠券分发人实体。
 * 定向券指派给指定用户（客服/打手）发放：一人一码，
 * C 端凭分发码链接领取，领取记录经 user_coupon.distributorUserId 归因。
 */
@Entity('coupon_distributor')
@Unique(['tenantId', 'couponId', 'userId'])
export class CouponDistributorEntity extends TenantScopedEntity {
  /** 所属券模板 */
  @Index()
  @Column({ length: 36 })
  couponId!: string;

  /** 分发人用户 id */
  @Index()
  @Column({ length: 36 })
  userId!: string;

  /** 分发码（全局唯一，拼接 C 端领取链接） */
  @Index({ unique: true })
  @Column({ length: COUPON_LIMITS.shareCodeLength })
  code!: string;
}
