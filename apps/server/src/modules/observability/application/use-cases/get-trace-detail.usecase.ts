import { Inject, Injectable } from '@nestjs/common';
import { TraceDetailView } from '@app/contracts';
import {
  LOG_REPOSITORY,
  LogRepository,
} from '../../domain/log-repository.interface';
import { toLogView } from '../log.mapper';

/** 用例：按 traceId 聚合查询单条链路的全部日志 */
@Injectable()
export class GetTraceDetailUseCase {
  constructor(
    @Inject(LOG_REPOSITORY) private readonly repository: LogRepository,
  ) {}

  async execute(traceId: string): Promise<TraceDetailView> {
    const logs = await this.repository.findByTraceId(traceId);
    return {
      traceId,
      total: logs.length,
      logs: logs.map(toLogView),
    };
  }
}
