import { Controller, Get, Query } from '@nestjs/common';
import { LogView, PaginatedResult, PERMS } from '@app/contracts';
import { ListLogsUseCase } from '../../application/use-cases/list-logs.usecase';
import { ListLogsQueryDto } from '../dto/list-logs-query.dto';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/** 路由：分页 + 多条件查询日志 */
@Controller('observability/logs')
export class LogListController {
  constructor(private readonly useCase: ListLogsUseCase) {}

  @Get()
  @Permissions(PERMS.log.list)
  list(@Query() query: ListLogsQueryDto): Promise<PaginatedResult<LogView>> {
    return this.useCase.execute(
      query.page,
      query.pageSize,
      query.skip,
      query.toFilter(),
    );
  }
}
