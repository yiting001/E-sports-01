import {
  BOOSTER_LEGACY_LIMITS,
  BOOSTER_LIMITS,
  BoosterContactType,
  BoosterGender,
  BoosterServiceRegion,
  BoosterStatus,
} from '@app/contracts';
import { Check, Column, Entity, Index, Unique } from 'typeorm';
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
@Index('IDX_booster_directory', ['tenantId', 'status', 'createdAt'])
@Check('CHK_booster_application_gender', `"gender" IN ('', 'male', 'female')`)
@Check('CHK_booster_application_contact_type', `"contact_type" IN ('', 'phone', 'wechat', 'qq')`)
@Check(
  'CHK_booster_application_service_regions_array',
  `jsonb_typeof("service_regions") = 'array'`,
)
export class BoosterApplicationEntity extends TenantScopedEntity {
  /** 归属用户 */
  @Index()
  @Column({ length: 36 })
  userId!: string;

  /** 旧版游戏昵称列，保留用于历史数据与 migration 回滚 */
  @Column({
    name: 'game_nickname',
    length: BOOSTER_LEGACY_LIMITS.gameNicknameMax,
    default: '',
  })
  legacyGameNickname!: string;

  /** 旧版擅长游戏列，保留用于历史数据与 migration 回滚 */
  @Column({ name: 'game_name', length: BOOSTER_LEGACY_LIMITS.gameNameMax, default: '' })
  legacyGameName!: string;

  /** 旧版段位列，保留用于历史数据与 migration 回滚 */
  @Column({ name: 'rank', length: BOOSTER_LEGACY_LIMITS.rankMax, default: '' })
  legacyRank!: string;

  @Column({ name: 'applicant_name', length: BOOSTER_LIMITS.applicantNameMax, default: '' })
  applicantName!: string;

  @Column({ type: 'varchar', length: 16, default: '' })
  gender!: BoosterGender | '';

  @Column({ name: 'service_regions', type: 'jsonb', default: () => "'[]'" })
  serviceRegions!: BoosterServiceRegion[];

  /** 自我介绍（接单经验、可服务时间等） */
  @Column({ length: BOOSTER_LIMITS.introMax })
  intro!: string;

  @Column({ name: 'contact_type', type: 'varchar', length: 16, default: '' })
  contactType!: BoosterContactType | '';

  @Column({ name: 'contact_value', length: BOOSTER_LIMITS.contactValueMax, default: '' })
  contactValue!: string;

  @Column({ name: 'material_image', length: BOOSTER_LIMITS.materialImageMax, default: '' })
  materialImage!: string;

  /** C 端打手主页公开试听语音 URL；空串表示未上传 */
  @Column({ name: 'voice_url', length: BOOSTER_LIMITS.voiceUrlMax, default: '' })
  voiceUrl!: string;

  @Column({ name: 'invitation_code', length: BOOSTER_LIMITS.invitationCodeMax, default: '' })
  invitationCode!: string;

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

  /** 是否自主上线接单；默认下线，避免未明确授权时进入派单流程 */
  @Column({ name: 'accepting_orders', type: 'boolean', default: false })
  acceptingOrders!: boolean;
}
