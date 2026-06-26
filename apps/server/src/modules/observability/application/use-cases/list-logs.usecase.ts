import { Inject, Injectable } from '@nestjs/common';
import { LogView, PaginatedResult } from '@app/contracts';
import {
  LOG_REPOSITORY,
  LogRepository,
} from '../../domain/log-repository.interface';
import { LogFilter } from '../../domain/log-record';
import { toLogView } from '../log.mapper';

/** 用例：分页 + 多条件查询日志 */
@Injectable()
export class ListLogsUseCase {
  constructor(
    @Inject(LOG_REPOSITORY) private readonly repository: LogRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    filter: LogFilter,
  ): Promise<PaginatedResult<LogView>> {
    const result = await this.repository.paginate(skip, pageSize, filter);
    return {
      list: result.list.map(toLogView),
      total: result.total,
      page,
      pageSize,
    };
  }
}
