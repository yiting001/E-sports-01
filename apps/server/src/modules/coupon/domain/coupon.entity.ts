import { COUPON_LIMITS, CouponAudience, CouponType } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 优惠券聚合根（券模板）。
 * 管理端发券（满减/折扣、门槛、库存、限领、有效期），
 * 用户领取时把券面信息快照到 user_coupon，后续改券不影响已领。
 */
@Entity('coupon')
export class CouponEntity extends TenantScopedEntity {
  /** 券名 */
  @Column({ length: COUPON_LIMITS.titleMax })
  title!: string;

  /** 优惠方式：满减 / 折扣 */
  @Column({ type: 'varchar', length: 16 })
  type!: CouponType;

  /** 满减金额（分）或折扣万分比，语义随 type */
  @Column({ type: 'bigint', transformer: bigintTransformer })
  value!: number;

  /** 使用门槛：订单实付满多少分可用（0 = 无门槛） */
  @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
  thresholdFen!: number;

  /** 发行总量 */
  @Column({ type: 'int' })
  totalCount!: number;

  /** 已领取张数（领取时条件自增，杜绝超发） */
  @Column({ type: 'int', default: 0 })
  issuedCount!: number;

  /** 单用户限领张数 */
  @Column({ type: 'int', default: 1 })
  perUserLimit!: number;

  /** 有效期开始 */
  @Column({ type: 'timestamptz' })
  validFrom!: Date;

  /** 有效期结束 */
  @Column({ type: 'timestamptz' })
  validTo!: Date;

  /** 是否上架（仅上架的券可领取） */
  @Index()
  @Column({ default: true })
  enabled!: boolean;

  /** 发放方式：公开领取进领券中心；定向发放仅经分发人链接领取 */
  @Index()
  @Column({ type: 'varchar', length: 16, default: CouponAudience.Public })
  audience!: CouponAudience;
}
