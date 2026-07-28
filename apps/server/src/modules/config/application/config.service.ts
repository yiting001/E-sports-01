import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { DEFAULT_TENANT_ID } from '@app/contracts';
import { REDIS_CLIENT } from '../../../shared/redis/redis.constants';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { CONFIG_REPOSITORY, ConfigRepository } from '../domain/config-repository.interface';
import type { ConfigItem } from '../domain/config-item.entity';
import { isTenantOverridableConfigKey } from '../domain/tenant-config-keys';
import {
  TENANT_CONFIG_OVERRIDE_REPOSITORY,
  TenantConfigOverrideRepository,
} from '../domain/tenant-config-override-repository.interface';

type TenantCacheEntry = { overridden: true; value: string } | { overridden: false };

interface TenantCachePayload {
  overridden?: unknown;
  value?: unknown;
}

interface ConfigCacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expiryMode: 'EX', ttlSeconds: number): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  scan(
    cursor: string,
    matchKeyword: 'MATCH',
    pattern: string,
    countKeyword: 'COUNT',
    count: number,
  ): Promise<[string, string[]]>;
}

/**
 * 配置读取服务（应用层）。
 * 对外提供按类型读取配置的统一入口，并通过 Redis 做读穿透缓存。
 * 其它模块只依赖本服务获取可调参数，不再各自读 env 或写死常量。
 */
@Injectable()
export class ConfigService {
  private static readonly CACHE_PREFIX = 'config:v2:';
  private static readonly CACHE_TTL_SECONDS = 300;
  private static readonly CACHE_SCAN_COUNT = 100;
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    @Inject(CONFIG_REPOSITORY) private readonly repository: ConfigRepository,
    @Inject(TENANT_CONFIG_OVERRIDE_REPOSITORY)
    private readonly tenantOverrides: TenantConfigOverrideRepository,
    @Inject(REDIS_CLIENT) private readonly redis: ConfigCacheClient,
    private readonly tenant: TenantContextService,
  ) {}

  /** 读取原始字符串值，命中缓存优先；不存在返回 null */
  async getRaw(key: string): Promise<string | null> {
    const tenantId = this.resolveOverrideTenantId(key);
    if (tenantId) {
      return this.getTenantRaw(tenantId, key);
    }
    return this.getGlobalRaw(key);
  }

  private async getGlobalRaw(key: string): Promise<string | null> {
    const cacheKey = this.globalCacheKey(key);
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

  private async getTenantRaw(tenantId: string, key: string): Promise<string | null> {
    const cacheKey = this.tenantCacheKey(tenantId, key);
    const cached = await this.safeCacheGet(cacheKey);
    const cachedEntry = cached === null ? null : this.parseTenantCacheEntry(cached);
    if (cachedEntry) {
      return cachedEntry.overridden ? cachedEntry.value : this.getGlobalRaw(key);
    }

    const override = await this.tenantOverrides.findByTenantAndKey(tenantId, key);
    if (override) {
      await this.safeCacheSet(
        cacheKey,
        JSON.stringify({ overridden: true, value: override.value } satisfies TenantCacheEntry),
      );
      return override.value;
    }
    await this.safeCacheSet(
      cacheKey,
      JSON.stringify({ overridden: false } satisfies TenantCacheEntry),
    );
    return this.getGlobalRaw(key);
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

  /**
   * 写入原始字符串值（不存在则建、存在则更新值），并使缓存失效。
   * meta 仅在新建/需要纠正元数据时给出（分组/类型/备注/敏感标记）。
   */
  async setRaw(
    key: string,
    value: string,
    meta?: Partial<Pick<ConfigItem, 'type' | 'group' | 'remark' | 'secret'>>,
  ): Promise<void> {
    this.assertCanMutate();
    const tenantId = this.resolveOverrideTenantId(key);
    if (tenantId) {
      await this.tenantOverrides.upsert(tenantId, key, value);
      await this.invalidate(key);
      return;
    }
    await this.repository.upsert({ key, value, ...meta });
    await this.invalidate(key);
  }

  /** 写入 JSON 值（序列化为字符串落库），并使缓存失效 */
  async setJson<T>(key: string, value: T): Promise<void> {
    await this.setRaw(key, JSON.stringify(value));
  }

  /** 删除当前租户覆盖（恢复全局值），或由平台上下文删除全局配置。 */
  async remove(key: string): Promise<void> {
    this.assertCanMutate();
    const tenantId = this.resolveOverrideTenantId(key);
    if (tenantId) {
      await this.tenantOverrides.remove(tenantId, key);
      await this.invalidate(key);
      return;
    }
    await this.repository.remove(key);
    if (isTenantOverridableConfigKey(key)) {
      await this.invalidateGlobalAndTenantCaches(key);
      return;
    }
    await this.invalidate(key);
  }

  /** 配置变更后清理缓存，使下次读取回源 */
  async invalidate(key: string): Promise<void> {
    const tenantId = this.resolveOverrideTenantId(key);
    const cacheKey = tenantId ? this.tenantCacheKey(tenantId, key) : this.globalCacheKey(key);
    await this.safeCacheDelete([cacheKey]);
  }

  private async invalidateGlobalAndTenantCaches(key: string): Promise<void> {
    await this.safeCacheDelete([this.globalCacheKey(key)]);
    let cursor = '0';
    const pattern = `${ConfigService.CACHE_PREFIX}tenant:*:${key}`;
    try {
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          ConfigService.CACHE_SCAN_COUNT,
        );
        await this.safeCacheDelete(keys);
        cursor = nextCursor;
      } while (cursor !== '0');
    } catch {
      this.logger.warn(`配置 ${key} 的租户缓存批量失效失败，将在 TTL 到期后恢复`);
    }
  }

  private resolveOverrideTenantId(key: string): string | null {
    const tenantId = this.tenant.tenantId;
    return isTenantOverridableConfigKey(key) &&
      !this.tenant.isSuper &&
      tenantId !== DEFAULT_TENANT_ID
      ? tenantId
      : null;
  }

  private assertCanMutate(): void {
    if (!this.tenant.isSuper && this.tenant.tenantId === DEFAULT_TENANT_ID) {
      throw new ForbiddenException('默认租户只能读取平台全局配置');
    }
  }

  private globalCacheKey(key: string): string {
    return `${ConfigService.CACHE_PREFIX}global:${key}`;
  }

  private tenantCacheKey(tenantId: string, key: string): string {
    return `${ConfigService.CACHE_PREFIX}tenant:${tenantId}:${key}`;
  }

  private parseTenantCacheEntry(raw: string): TenantCacheEntry | null {
    try {
      const parsed = JSON.parse(raw) as TenantCachePayload;
      if (typeof parsed.overridden !== 'boolean') {
        return null;
      }
      if (parsed.overridden) {
        return typeof parsed.value === 'string' ? { overridden: true, value: parsed.value } : null;
      }
      return { overridden: false };
    } catch {
      return null;
    }
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

  private async safeCacheDelete(cacheKeys: string[]): Promise<void> {
    if (cacheKeys.length === 0) {
      return;
    }
    try {
      await this.redis.del(...cacheKeys);
    } catch {
      this.logger.warn('配置缓存失效失败，将在 TTL 到期后恢复');
    }
  }
}
