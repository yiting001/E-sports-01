import { LogLevel, LogType } from '@app/contracts';

/**
 * 待写入的日志记录草稿。
 * 由拦截器/AppLogger 构造，经缓冲后批量落库；不含审计字段（由实体基类生成）。
 */
export interface LogRecordDraft {
  traceId: string;
  spanId: string;
  level: LogLevel;
  type: LogType;
  context: string;
  message: string;
  method: string;
  path: string;
  statusCode: number | null;
  durationMs: number | null;
  userId: string | null;
  username: string | null;
  ip: string;
  userAgent: string;
  stack: string | null;
}

/** 日志过滤条件（领域内的查询规格，独立于 HTTP DTO） */
export interface LogFilter {
  level?: LogLevel;
  type?: LogType;
  traceId?: string;
  path?: string;
  userId?: string;
  startTime?: Date;
  endTime?: Date;
}
