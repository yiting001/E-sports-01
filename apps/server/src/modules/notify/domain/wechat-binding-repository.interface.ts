import type { NotifyWechatChannel } from '@app/contracts';
import type { WechatBindingEntity } from './wechat-binding.entity';

export const WECHAT_BINDING_REPOSITORY = Symbol('WECHAT_BINDING_REPOSITORY');

/** 微信绑定仓储端口；实现必须按当前租户上下文过滤 */
export interface WechatBindingRepository {
  /** 当前用户的全部绑定 */
  findByUser(userId: string): Promise<WechatBindingEntity[]>;
  /** 指定用户集合在某渠道下的绑定（群发解析收件人） */
  findByUsers(userIds: string[], channel: NotifyWechatChannel): Promise<WechatBindingEntity[]>;
  /** 幂等保存绑定：同用户同渠道存在则更新 openid */
  upsert(userId: string, channel: NotifyWechatChannel, openid: string): Promise<WechatBindingEntity>;
  /** 解除绑定，不存在时静默成功 */
  removeByUserChannel(userId: string, channel: NotifyWechatChannel): Promise<void>;
}
