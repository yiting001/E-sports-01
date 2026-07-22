import { OrderPaymentMethod, OrderRefundStatus, OrderStatus } from '@app/contracts';
import { Check, Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';
import { OrderEntity } from './order.entity';

/**
 * 订单全额退款申请。
 * 一单一申请，refundNo 是稳定业务号，channelRefundNo 是当前渠道尝试号。
 */
@Entity('service_order_refund')
@Index('IDX_service_order_refund_tenant_status', ['tenantId', 'status'])
@Index('IDX_service_order_refund_tenant_user', ['tenantId', 'userId'])
@Index('UQ_service_order_refund_channel_no', ['channelRefundNo'], {
  unique: true,
  where: `"channel_refund_no" <> ''`,
})
@Check('CHK_service_order_refund_amount', '"amount_fen" >= 0')
@Check(
  'CHK_service_order_refund_attempt',
  `("attempt" = 0 AND "channel_refund_no" = '') OR ("attempt" > 0 AND "channel_refund_no" <> '')`,
)
@Check(
  'CHK_service_order_refund_source_status',
  `"source_order_status" IN ('pending_service', 'dispatching')`,
)
@Check(
  'CHK_service_order_refund_status',
  `"status" IN ('pending_review', 'processing', 'succeeded', 'rejected', 'failed')`,
)
export class OrderRefundEntity extends TenantScopedEntity {
  @Index({ unique: true })
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @OneToOne(() => OrderEntity, (order) => order.refund, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId!: string;

  /** 稳定业务退款号，贯穿申请全生命周期。 */
  @Index({ unique: true })
  @Column({ name: 'refund_no', length: 64 })
  refundNo!: string;

  /** 当前渠道尝试号；明确失败后的下一次尝试必须更换。 */
  @Column({ name: 'channel_refund_no', length: 64, default: '' })
  channelRefundNo!: string;

  /** 已创建的渠道尝试次数；余额和零元退款保持 0。 */
  @Column({ type: 'integer', default: 0 })
  attempt!: number;

  @Column({ name: 'amount_fen', type: 'bigint', transformer: bigintTransformer })
  amountFen!: number;

  @Column({ name: 'payment_method', type: 'varchar', length: 16 })
  paymentMethod!: OrderPaymentMethod;

  /** 申请前履约状态；审核驳回时原样恢复。 */
  @Column({ name: 'source_order_status', type: 'varchar', length: 24 })
  sourceOrderStatus!: OrderStatus.PendingService | OrderStatus.Dispatching;

  @Column({ type: 'varchar', length: 500 })
  reason!: string;

  @Column({ type: 'varchar', length: 24, default: OrderRefundStatus.PendingReview })
  status!: OrderRefundStatus;

  @Column({ name: 'provider_refund_no', type: 'varchar', length: 128, default: '' })
  providerRefundNo!: string;

  @Column({ name: 'reviewer_id', type: 'varchar', length: 36, default: '' })
  reviewerId!: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'reject_reason', type: 'varchar', length: 500, default: '' })
  rejectReason!: string;

  @Column({ name: 'fail_reason', type: 'varchar', length: 500, default: '' })
  failReason!: string;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt!: Date | null;
}
