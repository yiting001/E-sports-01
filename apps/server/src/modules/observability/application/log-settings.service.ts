import { Injectable } from '@nestjs/common';
import { CONFIG_KEYS, LogLevel } from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import { LOG_DEFAULTS } from '../domain/log-defaults';

/** 日志运行期设置快照 */
export interface LogSettings {
  persistEnabled: boolean;
  level: LogLevel;
  requestSampleRate: number;
  retentionDays: number;
  excludePaths: string[];
}

/**
 * 日志设置服务。
 * 从配置中心读取日志相关参数并做短时缓存：
 * 拦截器走异步读取最新值；AppLogger 走同步快照（日志不应被 await 阻塞）。
 */
@Injectable()
export class LogSettingsService {
  /** 快照缓存有效期（毫秒），到期后下次读取触发刷新 */
  private static readonly TTL_MS = 5000;

  private cache: LogSettings = { ...LOG_DEFAULTS };
  private expireAt = 0;

  constructor(private readonly config: ConfigService) {}

  /** 异步获取最新设置；缓存有效时直接返回，过期则回源刷新 */
  async resolve(): Promise<LogSettings> {
    if (Date.now() < this.expireAt) {
      return this.cache;
    }
    const [persistEnabled, level, requestSampleRate, retentionDays, excludePaths] =
      await Promise.all([
        this.config.getBoolean(
          CONFIG_KEYS.log.persistEnabled,
          LOG_DEFAULTS.persistEnabled,
        ),
        this.config.getString(CONFIG_KEYS.log.level, LOG_DEFAULTS.level),
        this.config.getNumber(
          CONFIG_KEYS.log.requestSampleRate,
          LOG_DEFAULTS.requestSampleRate,
        ),
        this.config.getNumber(
          CONFIG_KEYS.log.retentionDays,
          LOG_DEFAULTS.retentionDays,
        ),
        this.config.getJson<string[]>(
          CONFIG_KEYS.log.excludePaths,
          [...LOG_DEFAULTS.excludePaths],
        ),
      ]);
    this.cache = {
      persistEnabled,
      level: this.normalizeLevel(level),
      requestSampleRate,
      retentionDays,
      excludePaths,
    };
    this.expireAt = Date.now() + LogSettingsService.TTL_MS;
    return this.cache;
  }

  /** 同步返回最近一次快照（供同步日志路径使用） */
  current(): LogSettings {
    return this.cache;
  }

  private normalizeLevel(value: string): LogLevel {
    return (Object.values(LogLevel) as string[]).includes(value)
      ? (value as LogLevel)
      : LOG_DEFAULTS.level;
  }
}
