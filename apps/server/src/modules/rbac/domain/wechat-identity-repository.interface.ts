import type { WechatIdentityEntity } from './wechat-identity.entity';

export const WECHAT_IDENTITY_REPOSITORY = Symbol('WECHAT_IDENTITY_REPOSITORY');

/**
 * 微信公众号登录身份仓储端口。
 * 登录发生在鉴权之前（无租户上下文），全部方法显式传租户 ID 过滤。
 */
export interface WechatIdentityRepository {
  /** 按租户 + openid 查身份（登录路由依据） */
  findByOpenid(openid: string, tenantId: string): Promise<WechatIdentityEntity | null>;
  /** 按租户 + 用户查身份（JSAPI 支付取 openid、绑定状态） */
  findByUser(userId: string, tenantId: string): Promise<WechatIdentityEntity | null>;
  /** 创建绑定；违反租户内唯一约束时由数据库拒绝 */
  save(identity: Pick<WechatIdentityEntity, 'userId' | 'openid' | 'tenantId'>): Promise<WechatIdentityEntity>;
}
