import { LogLevel } from '@app/contracts';

/**
 * 日志相关默认值（唯一登记处）。
 * 既作为配置中心的播种默认值，也作为读取失败时的兜底，避免两处各写一份。
 */
export const LOG_DEFAULTS = {
  persistEnabled: true,
  level: LogLevel.Info,
  requestSampleRate: 1,
  retentionDays: 14,
  /** 默认不记录的访问路径前缀：健康检查与日志接口自身（防自我递归记录） */
  excludePaths: ['/api/observability/logs'] as string[],
} as const;
