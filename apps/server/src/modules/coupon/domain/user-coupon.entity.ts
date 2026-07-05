import { COUPON_LIMITS, CouponType, UserCouponStatus } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 用户券实体。
 * 领取时固化券面快照（券名/方式/面值/门槛/过期时间），
 * 下单核销回填订单号，取消订单未过期可回退复用。
 */
@Entity('user_coupon')
export class UserCouponEntity extends TenantScopedEntity {
  /** 持券用户 */
  @Index()
  @Column({ length: 36 })
  userId!: string;

  /** 来源券模板 */
  @Index()
  @Column({ length: 36 })
  couponId!: string;

  /** 券名快照 */
  @Column({ length: COUPON_LIMITS.titleMax })
  title!: string;

  /** 优惠方式快照 */
  @Column({ type: 'varchar', length: 16 })
  type!: CouponType;

  /** 面值快照（满减分 / 折扣万分比） */
  @Column({ type: 'bigint', transformer: bigintTransformer })
  value!: number;

  /** 使用门槛快照（分） */
  @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
  thresholdFen!: number;

  /** 过期时间快照（领取时券的有效期结束） */
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  /** 券状态 */
  @Column({ type: 'varchar', length: 16, default: UserCouponStatus.Unused })
  status!: UserCouponStatus;

  /** 核销订单 id（未使用为 null） */
  @Column({ type: 'varchar', length: 36, nullable: true })
  usedOrderId!: string | null;
}
