import { LogView } from '@app/contracts';
import { SysLog } from '../domain/sys-log.entity';

/** 领域实体 → 对外视图 */
export function toLogView(log: SysLog): LogView {
  return {
    id: log.id,
    traceId: log.traceId,
    spanId: log.spanId,
    level: log.level,
    type: log.type,
    context: log.context,
    message: log.message,
    method: log.method,
    path: log.path,
    statusCode: log.statusCode,
    durationMs: log.durationMs,
    userId: log.userId,
    username: log.username,
    ip: log.ip,
    userAgent: log.userAgent,
    stack: log.stack,
    detail: log.detail,
    createdAt: log.createdAt.toISOString(),
  };
}
