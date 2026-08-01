import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../shared/redis/redis.constants';

/** 微信 API 根地址（小程序与公众号共用开放平台域名） */
export const WECHAT_API_BASE = 'https://api.weixin.qq.com';

/** access_token 提前失效秒数：规避网络延迟导致的临界过期 */
const TOKEN_EXPIRES_SAFETY_SECONDS = 300;

interface WechatTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信接口调用凭证服务。
 * 按 appId 获取并在 Redis 缓存 access_token（提前 5 分钟过期）；
 * 缓存不可用时直接回源微信，不阻断通知发送。
 */
@Injectable()
export class WechatAccessTokenService {
  private readonly logger = new Logger(WechatAccessTokenService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getToken(appId: string, appSecret: string): Promise<string> {
    const cacheKey = `notify:wechat:token:${appId}`;
    const cached = await this.safeGet(cacheKey);
    if (cached) {
      return cached;
    }
    const url =
      `${WECHAT_API_BASE}/cgi-bin/token?grant_type=client_credential` +
      `&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
    const response = await fetch(url);
    const body = (await response.json()) as WechatTokenResponse;
    if (!body.access_token) {
      throw new ServiceUnavailableException(
        `获取微信 access_token 失败：${body.errcode ?? ''} ${body.errmsg ?? '未知错误'}`,
      );
    }
    const ttl = Math.max((body.expires_in ?? 7200) - TOKEN_EXPIRES_SAFETY_SECONDS, 60);
    await this.safeSet(cacheKey, body.access_token, ttl);
    return body.access_token;
  }

  private async safeGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  private async safeSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } catch {
      this.logger.warn('微信 access_token 缓存写入失败，将在下次发送时重新获取');
    }
  }
}
