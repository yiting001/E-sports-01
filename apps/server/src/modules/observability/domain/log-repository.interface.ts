import { PaginatedResult } from '@app/contracts';
import { SysLog } from './sys-log.entity';
import { LogFilter, LogRecordDraft } from './log-record';

/** 日志仓储注入令牌 */
export const LOG_REPOSITORY = Symbol('LOG_REPOSITORY');

/**
 * 日志仓储接口（领域层定义，基础设施层实现）。
 * 写入以批量为主以降低 IO 压力；读取支持分页多条件筛选与按 traceId 聚合。
 */
export interface LogRepository {
  /** 批量插入日志（缓冲刷盘调用） */
  saveMany(records: LogRecordDraft[]): Promise<void>;

  /** 分页 + 多条件筛选，按创建时间倒序 */
  paginate(
    skip: number,
    take: number,
    filter: LogFilter,
  ): Promise<PaginatedResult<SysLog>>;

  /** 取某条链路下的全部日志，按创建时间升序 */
  findByTraceId(traceId: string): Promise<SysLog[]>;

  /** 删除创建时间早于指定时刻的日志，返回删除条数 */
  deleteOlderThan(threshold: Date): Promise<number>;
}
