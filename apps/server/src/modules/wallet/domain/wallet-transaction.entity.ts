import { FundDirection, WalletTxnType } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 钱包流水（明细）实体。
 * 每一次余额变更都追加一条不可变流水，记录变更后的余额快照，
 * 作为对账与明细展示的依据；流水只增不改。
 */
@Entity('wallet_transaction')
export class WalletTransactionEntity extends TenantScopedEntity {
  /** 所属钱包 */
  @Index()
  @Column({ length: 36 })
  walletId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: WalletTxnType;

  @Column({ type: 'varchar', length: 8 })
  direction!: FundDirection;

  /** 变更金额（分，恒为正，方向由 direction 表达） */
  @Column({ type: 'bigint', transformer: bigintTransformer })
  amountFen!: number;

  /** 变更后余额（分） */
  @Column({ type: 'bigint', transformer: bigintTransformer })
  balanceAfterFen!: number;

  /** 关联业务单号（充值/提现订单 ID），平台调整时为空 */
  @Column({ type: 'varchar', length: 36, nullable: true })
  bizOrderId!: string | null;

  @Column({ length: 255, default: '' })
  remark!: string;
}
