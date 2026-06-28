import { PaymentProvider, RechargeStatus } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 充值订单实体。
 * 记录一次充值的渠道、金额与支付状态；以商户订单号 outTradeNo 全局唯一，
 * 作为回调入账的幂等键，杜绝重复入账。
 */
@Entity('wallet_recharge_order')
export class RechargeOrderEntity extends TenantScopedEntity {
  @Index()
  @Column({ length: 36 })
  walletId!: string;

  /** 商户订单号（提交给支付渠道并在回调中带回，幂等键） */
  @Index({ unique: true })
  @Column({ length: 64 })
  outTradeNo!: string;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  amountFen!: number;

  @Column({ type: 'varchar', length: 16 })
  provider!: PaymentProvider;

  @Column({ type: 'varchar', length: 16, default: RechargeStatus.Pending })
  status!: RechargeStatus;

  /** 渠道交易号（支付成功后回填） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  providerTradeNo!: string | null;
}
