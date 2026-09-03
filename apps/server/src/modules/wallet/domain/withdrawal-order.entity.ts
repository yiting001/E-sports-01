import { PayoutChannelState, PayoutProvider, WithdrawalStatus } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 提现订单实体。
 * 记录一次提现的渠道、金额、收款账户与处理状态；
 * 采用「申请即冻结扣减 + 人工审核」：创建时余额已扣并置 pending，
 * 财务审核通过后发起渠道转账（异步渠道保持 processing 直到通知/查单确认）；
 * 驳回/转账明确失败则回滚余额。channel* 字段为渠道侧快照，供财务对账与排错。
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

  /** 手续费（分），申请时按配置费率固定；实际转账金额 = amountFen - feeFen */
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  feeFen!: number;

  @Column({ type: 'varchar', length: 16 })
  provider!: PayoutProvider;

  @Column({ type: 'varchar', length: 16, default: WithdrawalStatus.Pending })
  status!: WithdrawalStatus;

  /** 收款方账号（支付宝登录号：邮箱/手机号；微信零钱为服务端绑定的 openid） */
  @Column({ length: 128 })
  account!: string;

  /** 收款方真实姓名 */
  @Column({ length: 64 })
  accountName!: string;

  /** 收款方身份证号（报税用；历史单据为空） */
  @Column({ type: 'varchar', length: 18, nullable: true })
  idCardNo!: string | null;

  /** 渠道转账单号（计全付 transferId / 支付宝 order_id，受理后回填） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  providerOrderId!: string | null;

  /** 渠道上游（微信/支付宝）转账单号 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  channelOrderNo!: string | null;

  /** 渠道归一状态快照 */
  @Column({ type: 'varchar', length: 16, nullable: true })
  channelState!: PayoutChannelState | null;

  /** 渠道错误码 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  channelErrCode!: string | null;

  /** 渠道错误描述 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  channelErrMsg!: string | null;

  /** 渠道手续费（分，商户承担，与平台向用户收取的 feeFen 无关） */
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  channelFeeFen!: number;

  /** 最近一次与渠道同步（发起/通知/查单）时间 */
  @Column({ type: 'timestamptz', nullable: true })
  channelSyncedAt!: Date | null;

  /** 失败原因（失败时回填） */
  @Column({ type: 'varchar', length: 255, nullable: true })
  failReason!: string | null;
}
