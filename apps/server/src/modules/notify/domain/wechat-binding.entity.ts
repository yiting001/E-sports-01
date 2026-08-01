import { NotifyWechatChannel } from '@app/contracts';
import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 用户微信通知绑定。
 * 每个租户内，一个用户对每种渠道（小程序/公众号）最多一条绑定记录；
 * openid 由服务端凭 code 向微信换取，客户端不能直接提交 openid。
 */
@Entity('notify_wechat_binding')
@Unique('UQ_notify_wechat_binding_user_channel', ['tenantId', 'userId', 'channel'])
export class WechatBindingEntity extends TenantScopedEntity {
  /** 绑定用户 */
  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId!: string;

  /** 通知渠道：mini（小程序订阅消息）/ official（公众号模板消息） */
  @Column({ length: 16 })
  channel!: NotifyWechatChannel;

  /** 对应渠道应用下的用户 openid */
  @Column({ length: 64 })
  openid!: string;
}
