import { RealnameStatus } from '@app/contracts';
import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 实名认证聚合根。
 * 每个用户在每个租户下至多一条实名记录；身份证号加密存储，另存脱敏串供展示，
 * 状态机：pending →（审核）→ approved / rejected，rejected 后可覆盖重提回到 pending。
 */
@Entity('realname_auth')
@Unique(['tenantId', 'userId'])
export class RealnameAuthEntity extends TenantScopedEntity {
  /** 归属用户 */
  @Index()
  @Column({ length: 36 })
  userId!: string;

  /** 真实姓名 */
  @Column({ length: 64 })
  realName!: string;

  /** 身份证号密文（AES-256-GCM），绝不存明文 */
  @Column({ name: 'id_card_cipher', type: 'text' })
  idCardCipher!: string;

  /** 脱敏身份证号，用于列表/详情展示，免解密 */
  @Column({ name: 'id_card_masked', length: 32 })
  idCardMasked!: string;

  /** 证件正面（人像面）图片 URL */
  @Column({ name: 'front_image', length: 512 })
  frontImage!: string;

  /** 证件反面（国徽面）图片 URL */
  @Column({ name: 'back_image', length: 512 })
  backImage!: string;

  @Column({ type: 'varchar', length: 16, default: RealnameStatus.Pending })
  status!: RealnameStatus;

  /** 驳回理由；非驳回为空串 */
  @Column({ name: 'reject_reason', length: 255, default: '' })
  rejectReason!: string;

  /** 审核人用户 id；未审核为空串 */
  @Column({ name: 'reviewed_by', length: 36, default: '' })
  reviewedBy!: string;

  /** 审核时间；未审核为 null */
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;
}
