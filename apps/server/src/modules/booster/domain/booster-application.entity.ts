import { BoosterStatus, BOOSTER_LIMITS } from '@app/contracts';
import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 打手入驻申请聚合根。
 * 每个用户在每个租户下至多一条申请记录；
 * 状态机：pending →（审核）→ approved / rejected，rejected 后可覆盖重提回到 pending；
 * approved 时由用例侧为用户授予 booster 角色。
 */
@Entity('booster_application')
@Unique(['tenantId', 'userId'])
export class BoosterApplicationEntity extends TenantScopedEntity {
  /** 归属用户 */
  @Index()
  @Column({ length: 36 })
  userId!: string;

  /** 游戏昵称 */
  @Column({ name: 'game_nickname', length: BOOSTER_LIMITS.gameNicknameMax })
  gameNickname!: string;

  /** 擅长游戏 */
  @Column({ name: 'game_name', length: BOOSTER_LIMITS.gameNameMax })
  gameName!: string;

  /** 段位/实力描述 */
  @Column({ length: BOOSTER_LIMITS.rankMax })
  rank!: string;

  /** 自我介绍（接单经验、可服务时间等） */
  @Column({ length: BOOSTER_LIMITS.introMax })
  intro!: string;

  @Column({ type: 'varchar', length: 16, default: BoosterStatus.Pending })
  status!: BoosterStatus;

  /** 驳回理由；非驳回为空串 */
  @Column({ name: 'reject_reason', length: 255, default: '' })
  rejectReason!: string;

  /** 审核人用户 id；未审核为空串 */
  @Column({ name: 'reviewed_by', length: 36, default: '' })
  reviewedBy!: string;

  /** 审核时间；未审核为 null */
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  /** 累计完成订单数（订单完成结算时递增，等级定级依据） */
  @Column({ name: 'completed_orders', type: 'int', default: 0 })
  completedOrders!: number;

  /** 已缴押金（分，平台代管；缴纳增加、退还/罚扣减少） */
  @Column({ name: 'deposit_fen', type: 'bigint', default: 0, transformer: bigintTransformer })
  depositFen!: number;
}
