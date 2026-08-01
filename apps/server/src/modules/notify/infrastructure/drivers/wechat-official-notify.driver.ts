import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CONFIG_KEYS, NotifyWechatChannel } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import {
  WechatNotifyPort,
  WechatOrderNotification,
} from '../../domain/wechat-notify-port.interface';
import { buildTemplateData, parseOrderFieldMapping } from '../../application/order-field-mapping';
import { WECHAT_API_BASE, WechatAccessTokenService } from '../wechat-access-token.service';

interface WechatApiResponse {
  errcode?: number;
  errmsg?: string;
  openid?: string;
}

/**
 * 微信公众号（订阅号/服务号）模板消息驱动。
 * 模板消息要求用户已关注公众号；openid 通过网页授权（snsapi_base）获取。
 * 43004（未关注）按跳过处理，不算系统失败。
 */
@Injectable()
export class WechatOfficialNotifyDriver implements WechatNotifyPort {
  readonly channel = NotifyWechatChannel.Official;

  constructor(
    private readonly config: ConfigService,
    private readonly tokens: WechatAccessTokenService,
  ) {}

  async isConfigured(): Promise<boolean> {
    const [appId, appSecret, templateId] = await Promise.all([
      this.config.getString(CONFIG_KEYS.notify.officialAppId, ''),
      this.config.getString(CONFIG_KEYS.notify.officialAppSecret, ''),
      this.config.getString(CONFIG_KEYS.notify.officialOrderTemplateId, ''),
    ]);
    return Boolean(appId && appSecret && templateId);
  }

  async sendOrderNotification({ openid, payload }: WechatOrderNotification): Promise<void> {
    const [appId, appSecret, templateId, url, rawMapping] = await Promise.all([
      this.config.getString(CONFIG_KEYS.notify.officialAppId, ''),
      this.config.getString(CONFIG_KEYS.notify.officialAppSecret, ''),
      this.config.getString(CONFIG_KEYS.notify.officialOrderTemplateId, ''),
      this.config.getString(CONFIG_KEYS.notify.officialOrderUrl, ''),
      this.config.getJson<Record<string, string>>(CONFIG_KEYS.notify.officialOrderFields, {}),
    ]);
    if (!appId || !appSecret || !templateId) {
      throw new ServiceUnavailableException('公众号模板消息配置不完整');
    }
    const token = await this.tokens.getToken(appId, appSecret);
    const body: Record<string, unknown> = {
      touser: openid,
      template_id: templateId,
      data: buildTemplateData(parseOrderFieldMapping(rawMapping), payload),
    };
    if (url) {
      body.url = url;
    }
    const response = await fetch(
      `${WECHAT_API_BASE}/cgi-bin/message/template/send?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    const result = (await response.json()) as WechatApiResponse;
    // 43004：收件人未关注公众号，属正常业务态
    if (result.errcode && result.errcode !== 43004) {
      throw new ServiceUnavailableException(
        `公众号模板消息发送失败：${result.errcode} ${result.errmsg ?? ''}`,
      );
    }
  }

  /** 公众号网页授权 code 换 openid（snsapi_base 静默授权） */
  async exchangeOpenid(code: string): Promise<string> {
    const [appId, appSecret] = await Promise.all([
      this.config.getString(CONFIG_KEYS.notify.officialAppId, ''),
      this.config.getString(CONFIG_KEYS.notify.officialAppSecret, ''),
    ]);
    if (!appId || !appSecret) {
      throw new ServiceUnavailableException('公众号凭证未配置，无法绑定');
    }
    const url =
      `${WECHAT_API_BASE}/sns/oauth2/access_token?appid=${encodeURIComponent(appId)}` +
      `&secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}` +
      `&grant_type=authorization_code`;
    const response = await fetch(url);
    const result = (await response.json()) as WechatApiResponse;
    if (!result.openid) {
      throw new ServiceUnavailableException(
        `公众号授权码校验失败：${result.errcode ?? ''} ${result.errmsg ?? '未知错误'}`,
      );
    }
    return result.openid;
  }

  /** 生成公众号网页授权跳转地址（绑定入口用，snsapi_base 不弹授权页） */
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
}
