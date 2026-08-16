import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { CONFIG_KEYS } from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import { WechatOauthPort } from '../domain/wechat-oauth-port.interface';

/** 微信开放平台 OAuth 接口根地址 */
const WECHAT_API_BASE = 'https://api.weixin.qq.com';

/** OAuth 换取 openid 响应（仅取所需字段） */
interface WechatOauthTokenResponse {
  openid?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信公众号网页授权驱动（登录用）。
 * 复用配置中心 notify.wechat.official.* 公众号凭证（与模板通知同一公众号），
 * 授权采用 scope=snsapi_base（静默授权，只取 openid，不拉取头像昵称）。
 */
@Injectable()
export class WechatOauthDriver implements WechatOauthPort {
  constructor(private readonly config: ConfigService) {}

  async buildAuthorizeUrl(redirectUri: string): Promise<string> {
    const appId = await this.config.getString(CONFIG_KEYS.notify.officialAppId, '');
    if (!appId) {
      throw new ServiceUnavailableException('公众号凭证未配置，无法生成授权链接');
    }
    return (
      `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=snsapi_base#wechat_redirect`
    );
  }

  async exchangeOpenid(code: string): Promise<string> {
    const [appId, appSecret] = await Promise.all([
      this.config.getString(CONFIG_KEYS.notify.officialAppId, ''),
      this.config.getString(CONFIG_KEYS.notify.officialAppSecret, ''),
    ]);
    if (!appId || !appSecret) {
      throw new ServiceUnavailableException('公众号凭证未配置，无法微信登录');
    }
    const url =
      `${WECHAT_API_BASE}/sns/oauth2/access_token?appid=${encodeURIComponent(appId)}` +
      `&secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}` +
      `&grant_type=authorization_code`;
    const response = await fetch(url);
    const result = (await response.json()) as WechatOauthTokenResponse;
    if (!result.openid) {
      throw new UnauthorizedException(
        `微信授权码校验失败：${result.errcode ?? ''} ${result.errmsg ?? '未知错误'}`,
      );
    }
    return result.openid;
  }
}
