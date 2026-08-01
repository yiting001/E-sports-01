import type {
  MyWechatBindingsView,
  NotifyWechatChannel,
  WechatBindingView,
  WechatOfficialAuthorizeUrlView,
} from '@app/contracts';
import { http } from './http';

/**
 * 通知设置接口封装（C 端）。
 * 微信绑定的 openid 由服务端凭授权 code 换取，前端只传 code。
 */
export const notifyApi = {
  /** 本人微信绑定概览（含平台微信通知开关） */
  myWechatBindings(): Promise<MyWechatBindingsView> {
    return http.get('/notify/wechat/mine');
  },

  /** 用微信授权 code 绑定通知渠道 */
  bindWechat(channel: NotifyWechatChannel, code: string): Promise<WechatBindingView> {
    return http.post('/notify/wechat/bind', { channel, code });
  },

  /** 解除某渠道绑定 */
  unbindWechat(channel: NotifyWechatChannel): Promise<void> {
    return http.post('/notify/wechat/unbind', { channel });
  },

  /** 获取公众号网页授权跳转地址 */
  wechatAuthorizeUrl(redirectUri: string): Promise<WechatOfficialAuthorizeUrlView> {
    return http.get('/notify/wechat/authorize-url', { params: { redirectUri } });
  },
};
