import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 会员档案聚合根。
 * 每个用户在每个租户下至多一条，记录累计消费金额（支付成功时累加）；
 * 会员等级不落库，读取时按配置档位与累计消费实时解析，档位调整立即生效。
 */
@Entity('member_profile')
@Unique(['tenantId', 'userId'])
export class MemberProfileEntity extends TenantScopedEntity {
  /** 归属用户 */
  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId!: string;

  /** 累计消费金额（分，订单支付成功时累加） */
  @Column({ name: 'spend_fen', type: 'bigint', default: 0, transformer: bigintTransformer })
  spendFen!: number;
}
