import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 微信公众号登录身份（用户 ↔ openid 绑定）。
 * 租户内一个 openid 只能对应一个账号（登录路由依据）；
 * 一个账号也只保留一条公众号身份，避免多 openid 抢占同一账号。
 */
@Entity('auth_wechat_identity')
@Unique('UQ_auth_wechat_identity_openid', ['tenantId', 'openid'])
@Unique('UQ_auth_wechat_identity_user', ['tenantId', 'userId'])
export class WechatIdentityEntity extends TenantScopedEntity {
  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId!: string;

  @Column({ length: 64 })
  openid!: string;
}
