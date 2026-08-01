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
 * 微信小程序订阅消息驱动。
 * 凭证、模板、字段映射均来自配置中心；订阅消息需用户在小程序内先行订阅，
 * 未订阅的收件人由微信返回 43101，按跳过处理不算失败。
 */
@Injectable()
export class WechatMiniNotifyDriver implements WechatNotifyPort {
  readonly channel = NotifyWechatChannel.Mini;

  constructor(
    private readonly config: ConfigService,
    private readonly tokens: WechatAccessTokenService,
  ) {}

  async isConfigured(): Promise<boolean> {
    const [appId, appSecret, templateId] = await Promise.all([
      this.config.getString(CONFIG_KEYS.notify.miniAppId, ''),
      this.config.getString(CONFIG_KEYS.notify.miniAppSecret, ''),
      this.config.getString(CONFIG_KEYS.notify.miniOrderTemplateId, ''),
    ]);
    return Boolean(appId && appSecret && templateId);
  }

  async sendOrderNotification({ openid, payload }: WechatOrderNotification): Promise<void> {
    const [appId, appSecret, templateId, page, rawMapping] = await Promise.all([
      this.config.getString(CONFIG_KEYS.notify.miniAppId, ''),
      this.config.getString(CONFIG_KEYS.notify.miniAppSecret, ''),
      this.config.getString(CONFIG_KEYS.notify.miniOrderTemplateId, ''),
      this.config.getString(CONFIG_KEYS.notify.miniOrderPage, ''),
      this.config.getJson<Record<string, string>>(CONFIG_KEYS.notify.miniOrderFields, {}),
    ]);
    if (!appId || !appSecret || !templateId) {
      throw new ServiceUnavailableException('小程序订阅消息配置不完整');
    }
    const token = await this.tokens.getToken(appId, appSecret);
    const body: Record<string, unknown> = {
      touser: openid,
      template_id: templateId,
      data: buildTemplateData(parseOrderFieldMapping(rawMapping), payload),
    };
    if (page) {
      body.page = page;
    }
    const response = await fetch(
      `${WECHAT_API_BASE}/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    const result = (await response.json()) as WechatApiResponse;
    // 43101：用户未订阅或订阅次数用尽，属正常业务态而非配置/系统错误
    if (result.errcode && result.errcode !== 43101) {
      throw new ServiceUnavailableException(
        `小程序订阅消息发送失败：${result.errcode} ${result.errmsg ?? ''}`,
      );
    }
  }

  /** 小程序登录 code 换 openid（wx.login 获取的 code） */
  async exchangeOpenid(code: string): Promise<string> {
    const [appId, appSecret] = await Promise.all([
      this.config.getString(CONFIG_KEYS.notify.miniAppId, ''),
      this.config.getString(CONFIG_KEYS.notify.miniAppSecret, ''),
    ]);
    if (!appId || !appSecret) {
      throw new ServiceUnavailableException('小程序凭证未配置，无法绑定');
    }
    const url =
      `${WECHAT_API_BASE}/sns/jscode2session?appid=${encodeURIComponent(appId)}` +
      `&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(code)}` +
      `&grant_type=authorization_code`;
    const response = await fetch(url);
    const result = (await response.json()) as WechatApiResponse;
    if (!result.openid) {
      throw new ServiceUnavailableException(
        `小程序登录凭证校验失败：${result.errcode ?? ''} ${result.errmsg ?? '未知错误'}`,
      );
    }
    return result.openid;
  }
}
