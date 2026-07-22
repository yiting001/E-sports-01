import { OrderRefundStatus } from '@app/contracts';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { OrderRefundEntity } from './order-refund.entity';

export type OrderRefundAttemptStatus =
  | OrderRefundStatus.Processing
  | OrderRefundStatus.Succeeded
  | OrderRefundStatus.Failed;

/** 单次外部渠道退款尝试审计；重试新增记录，不覆盖历史尝试。 */
@Entity('service_order_refund_attempt')
@Index('UQ_service_order_refund_attempt_sequence', ['refundId', 'attempt'], { unique: true })
@Index('UQ_service_order_refund_attempt_channel_no', ['channelRefundNo'], { unique: true })
@Index('IDX_service_order_refund_attempt_tenant_refund', ['tenantId', 'refundId'])
@Check('CHK_service_order_refund_attempt_number', '"attempt" > 0')
@Check(
  'CHK_service_order_refund_attempt_status',
  `"status" IN ('processing', 'succeeded', 'failed')`,
)
export class OrderRefundAttemptEntity extends TenantScopedEntity {
  @Column({ name: 'refund_id', type: 'uuid' })
  refundId!: string;

  @ManyToOne(() => OrderRefundEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'refund_id' })
  refund!: OrderRefundEntity;

  @Column({ type: 'integer' })
  attempt!: number;

  @Column({ name: 'channel_refund_no', length: 64 })
  channelRefundNo!: string;

  @Column({ name: 'reviewer_id', length: 36 })
  reviewerId!: string;

  @Column({ name: 'provider_refund_no', length: 128, default: '' })
  providerRefundNo!: string;

  @Column({ type: 'varchar', length: 24, default: OrderRefundStatus.Processing })
  status!: OrderRefundAttemptStatus;

  @Column({ name: 'fail_reason', length: 500, default: '' })
  failReason!: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;
}
