import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 邀请记录实体：一条记录代表一次成功的邀请绑定。
 * invitee_id 全局唯一——一个用户只能被邀请一次；
 * 奖励发放结果以文案快照落库，后台改配置不影响历史记录展示。
 */
@Entity('invite_record')
export class InviteRecordEntity extends TenantScopedEntity {
  /** 邀请人用户 id */
  @Index()
  @Column({ name: 'inviter_id', length: 36 })
  inviterId!: string;

  /** 被邀请人用户 id（唯一，防重复绑定） */
  @Index({ unique: true })
  @Column({ name: 'invitee_id', length: 36 })
  inviteeId!: string;

  /** 邀请人奖励发放结果快照（如「优惠券『满50减10』」） */
  @Column({ name: 'inviter_reward_text', length: 128, default: '' })
  inviterRewardText!: string;

  /** 被邀请人奖励发放结果快照 */
  @Column({ name: 'invitee_reward_text', length: 128, default: '' })
  inviteeRewardText!: string;
}
