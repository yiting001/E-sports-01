import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/** 计全付钱包渠道开户状态（channelState，渠道侧定义） */
export const JQF_WALLET_CHANNEL_STATE = {
  /** 未开户（含本地尚未成功发起） */
  notOpened: 0,
  /** 开户成功 */
  opened: 1,
  /** 待审核 */
  pending: 2,
  /** 审核拒绝 */
  rejected: 3,
  /** 待激活 */
  inactive: 4,
  /** 开户失败 */
  failed: 5,
  /** 已注销 */
  closed: 6,
} as const;

/** 视为「无需重复发起开户」的渠道状态：成功 / 待审核 / 待激活 */
export const JQF_WALLET_SETTLED_STATES: readonly number[] = [
  JQF_WALLET_CHANNEL_STATE.opened,
  JQF_WALLET_CHANNEL_STATE.pending,
  JQF_WALLET_CHANNEL_STATE.inactive,
];

/**
 * 计全付钱包开户记录。
 * 每个用户在每个租户下至多一条；mchOrderNo 为提交渠道的商户单号（幂等键），
 * walletId 为渠道返回的钱包 id（未成功为空串），channelState 跟随渠道状态。
 */
@Entity('jqf_wallet_account')
@Unique(['tenantId', 'userId'])
export class JqfWalletAccountEntity extends TenantScopedEntity {
  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId!: string;

  /** 提交渠道的商户单号（幂等键） */
  @Index({ unique: true })
  @Column({ name: 'mch_order_no', length: 64 })
  mchOrderNo!: string;

  /** 渠道钱包 id；开户未成功为空串 */
  @Column({ name: 'wallet_id', length: 64, default: '' })
  walletId!: string;

  @Column({ name: 'channel_state', type: 'int', default: JQF_WALLET_CHANNEL_STATE.notOpened })
  channelState!: number;

  /** 最近一次失败原因；成功为空串 */
  @Column({ name: 'err_msg', length: 255, default: '' })
  errMsg!: string;

  /** 最近一次与渠道同步时间；未同步为 null */
  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt!: Date | null;
}
