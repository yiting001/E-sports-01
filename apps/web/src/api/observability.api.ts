import type {
  ListLogsQuery,
  LogView,
  PaginatedResult,
  TraceDetailView,
} from '@app/contracts';
import { http } from './http';

/** 清理日志入参（按保留天数，缺省走配置中心 retentionDays） */
export interface PurgeLogsBody {
  days?: number;
}

/** 清理日志结果 */
export interface PurgeLogsResult {
  retentionDays: number;
  deleted: number;
}

/** 可观测性（日志/链路）接口 */
export const observabilityApi = {
  list(query: ListLogsQuery): Promise<PaginatedResult<LogView>> {
    return http.get('/observability/logs', { params: query });
  },
  traceDetail(traceId: string): Promise<TraceDetailView> {
    return http.get(`/observability/logs/trace/${encodeURIComponent(traceId)}`);
  },
  purge(body: PurgeLogsBody): Promise<PurgeLogsResult> {
    return http.delete('/observability/logs', { data: body });
  },
};
