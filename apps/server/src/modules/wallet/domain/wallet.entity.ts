import { WalletStatus } from '@app/contracts';
import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 钱包聚合根。
 * 每个用户在每个租户下唯一一个钱包，持有余额与累计收支汇总；
 * 余额变更恒与流水写入处于同一事务（见 WalletLedger），并经乐观锁防并发覆盖。
 */
@Entity('wallet')
@Unique(['tenantId', 'userId'])
export class WalletEntity extends TenantScopedEntity {
  /** 钱包归属用户 */
  @Index()
  @Column({ length: 36 })
  userId!: string;

  /** 当前余额（分） */
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  balanceFen!: number;

  /** 累计充值成功金额（分） */
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  totalRechargeFen!: number;

  /** 累计提现成功金额（分） */
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  totalWithdrawFen!: number;

  @Column({ type: 'varchar', length: 16, default: WalletStatus.Active })
  status!: WalletStatus;
}
