import type { NotifyWechatChannel, OrderNotifyPayload } from '@app/contracts';

export const WECHAT_NOTIFY_PORT = Symbol('WECHAT_NOTIFY_PORT');

/** 单条微信通知的发送目标与内容 */
export interface WechatOrderNotification {
  openid: string;
  payload: OrderNotifyPayload;
}

/**
 * 微信通知发送端口。
 * 小程序订阅消息与公众号模板消息各自实现；配置（AppID/Secret/模板/字段映射）
 * 全部来自配置中心，发送失败抛异常由编排层记录，不阻断业务主流程。
 */
export interface WechatNotifyPort {
  readonly channel: NotifyWechatChannel;
  /** 该渠道凭证与模板是否已配置齐全（未配置时编排层直接跳过） */
  isConfigured(): Promise<boolean>;
  /** 发送订单通知；单个收件人失败不影响其他人（由实现内部保证或抛出后由编排层兜底） */
  sendOrderNotification(notification: WechatOrderNotification): Promise<void>;
  /** 用授权 code 换取用户 openid（绑定流程用） */
  exchangeOpenid(code: string): Promise<string>;
}

export const WECHAT_OFFICIAL_AUTH_PORT = Symbol('WECHAT_OFFICIAL_AUTH_PORT');

/** 公众号网页授权端口：生成 snsapi_base 授权跳转地址（绑定入口用） */
export interface WechatOfficialAuthPort {
  buildAuthorizeUrl(redirectUri: string): Promise<string>;
}
