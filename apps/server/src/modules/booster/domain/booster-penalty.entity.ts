import { PenaltySource, PENALTY_LIMITS } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 打手罚款记录。
 * 财务对打手罚款时留档：金额、扣除来源（余额/押金）、理由、操作人，
 * 余额扣除同时经 WalletLedger 记 penalty 出账流水，可全程审计追溯。
 */
@Entity('booster_penalty')
export class BoosterPenaltyEntity extends TenantScopedEntity {
  /** 来源反馈 id；通用人工罚款为空，投诉直接扣款时唯一 */
  @Index('UQ_booster_penalty_feedback_id', {
    unique: true,
    where: '"feedback_id" IS NOT NULL',
  })
  @Column({ name: 'feedback_id', type: 'varchar', length: 36, nullable: true })
  feedbackId!: string | null;

  /** 被罚打手的用户 id */
  @Index()
  @Column({ name: 'booster_user_id', length: 36 })
  boosterUserId!: string;

  /** 关联订单号（无则空串） */
  @Column({ name: 'order_no', length: PENALTY_LIMITS.orderNoMax, default: '' })
  orderNo!: string;

  /** 罚款金额（分） */
  @Column({ name: 'amount_fen', type: 'bigint', transformer: bigintTransformer })
  amountFen!: number;

  /** 扣除来源：balance 钱包余额 / deposit 押金 */
  @Column({ type: 'varchar', length: 16 })
  source!: PenaltySource;

  /** 罚款理由（必填，审计追溯） */
  @Column({ length: PENALTY_LIMITS.reasonMax })
  reason!: string;

  /** 操作人用户 id（财务） */
  @Column({ name: 'created_by', length: 36 })
  createdBy!: string;
}
