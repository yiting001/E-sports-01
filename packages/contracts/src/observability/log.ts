import { PaginationQuery } from '../common/pagination';

/**
 * 日志级别。
 * 用于结构化日志的分级与按级别过滤；数值序见 LOG_LEVEL_WEIGHT，便于阈值比较。
 */
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

/** 级别权重（越大越严重），用于“仅持久化 >= 配置级别”的阈值判断 */
export const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  [LogLevel.Debug]: 10,
  [LogLevel.Info]: 20,
  [LogLevel.Warn]: 30,
  [LogLevel.Error]: 40,
};

/**
 * 日志类型。
 * access：HTTP 访问日志；error：异常日志；app：业务/应用日志。
 */
export enum LogType {
  Access = 'access',
  Error = 'error',
  App = 'app',
}

/** 日志对外结构（查询接口返回） */
export interface LogView {
  id: string;
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
  /** 错误详情：异常响应体（含校验失败字段）与脱敏请求体，仅错误日志有值 */
  detail: string | null;
  createdAt: string;
}

/** 日志列表查询入参（分页 + 多条件筛选） */
export interface ListLogsQuery extends PaginationQuery {
  level?: LogLevel;
  type?: LogType;
  traceId?: string;
  path?: string;
  userId?: string;
  /** 起始时间（ISO 字符串，含） */
  startTime?: string;
  /** 结束时间（ISO 字符串，含） */
  endTime?: string;
}

/** 单条链路详情：同一 traceId 下按时间排序的全部日志 */
export interface TraceDetailView {
  traceId: string;
  total: number;
  logs: LogView[];
}
