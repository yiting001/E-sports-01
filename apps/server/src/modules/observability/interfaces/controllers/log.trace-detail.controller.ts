import { Controller, Get, Param } from '@nestjs/common';
import { PERMS, TraceDetailView } from '@app/contracts';
import { GetTraceDetailUseCase } from '../../application/use-cases/get-trace-detail.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/** 路由：按 traceId 查询单条链路全部日志 */
@Controller('observability/logs')
export class LogTraceDetailController {
  constructor(private readonly useCase: GetTraceDetailUseCase) {}

  @Get('trace/:traceId')
  @Permissions(PERMS.log.detail)
  detail(@Param('traceId') traceId: string): Promise<TraceDetailView> {
    return this.useCase.execute(traceId);
  }
}
