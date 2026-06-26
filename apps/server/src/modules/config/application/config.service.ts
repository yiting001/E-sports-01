import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../shared/redis/redis.constants';
import {
  CONFIG_REPOSITORY,
  ConfigRepository,
} from '../domain/config-repository.interface';

/**
 * 配置读取服务（应用层）。
 * 对外提供按类型读取配置的统一入口，并通过 Redis 做读穿透缓存。
 * 其它模块只依赖本服务获取可调参数，不再各自读 env 或写死常量。
 */
@Injectable()
export class ConfigService {
  private static readonly CACHE_PREFIX = 'config:';
  private static readonly CACHE_TTL_SECONDS = 300;
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    @Inject(CONFIG_REPOSITORY) private readonly repository: ConfigRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /** 读取原始字符串值，命中缓存优先；不存在返回 null */
  async getRaw(key: string): Promise<string | null> {
    const cacheKey = ConfigService.CACHE_PREFIX + key;
    const cached = await this.safeCacheGet(cacheKey);
    if (cached !== null) {
      return cached;
    }
    const item = await this.repository.findByKey(key);
    if (!item) {
      return null;
    }
    await this.safeCacheSet(cacheKey, item.value);
    return item.value;
  }

  async getString(key: string, fallback: string): Promise<string> {
    const raw = await this.getRaw(key);
    return raw ?? fallback;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.getRaw(key);
    if (raw === null) {
      return fallback;
    }
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    const raw = await this.getRaw(key);
    if (raw === null) {
      return fallback;
    }
    return raw === 'true' || raw === '1';
  }

  async getJson<T>(key: string, fallback: T): Promise<T> {
    const raw = await this.getRaw(key);
    if (raw === null) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.warn(`配置 ${key} 不是合法 JSON，返回默认值`);
      return fallback;
    }
  }

  /** 配置变更后清理缓存，使下次读取回源 */
  async invalidate(key: string): Promise<void> {
    await this.redis.del(ConfigService.CACHE_PREFIX + key).catch(() => undefined);
  }

  private async safeCacheGet(cacheKey: string): Promise<string | null> {
    try {
      return await this.redis.get(cacheKey);
    } catch {
      // 缓存不可用时降级为直接回源，不影响主流程
      return null;
    }
  }

  private async safeCacheSet(cacheKey: string, value: string): Promise<void> {
    try {
      await this.redis.set(cacheKey, value, 'EX', ConfigService.CACHE_TTL_SECONDS);
    } catch {
      // 忽略缓存写入失败
    }
  }
}
