import { PayoutProvider, WithdrawalStatus } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 提现订单实体。
 * 记录一次提现的渠道、金额、收款账户与处理状态；
 * 采用「申请即冻结扣减」：创建时余额已扣，转账失败则回滚并置 failed。
 */
@Entity('wallet_withdrawal_order')
export class WithdrawalOrderEntity extends TenantScopedEntity {
  @Index()
  @Column({ length: 36 })
  walletId!: string;

  /** 商户提现单号（提交给转账渠道，幂等键） */
  @Index({ unique: true })
  @Column({ length: 64 })
  outBizNo!: string;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  amountFen!: number;

  @Column({ type: 'varchar', length: 16 })
  provider!: PayoutProvider;

  @Column({ type: 'varchar', length: 16, default: WithdrawalStatus.Processing })
  status!: WithdrawalStatus;

  /** 收款方账号（支付宝登录号：邮箱/手机号） */
  @Column({ length: 128 })
  account!: string;

  /** 收款方真实姓名 */
  @Column({ length: 64 })
  accountName!: string;

  /** 渠道转账单号（成功后回填） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  providerOrderId!: string | null;

  /** 失败原因（失败时回填） */
  @Column({ type: 'varchar', length: 255, nullable: true })
  failReason!: string | null;
}
