import { Controller, Get, Query } from '@nestjs/common';
import { FinanceStatsView, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { GetFinanceStatsUseCase } from '../../application/use-cases/get-finance-stats.usecase';
import { StatsQueryDto } from '../dto/stats-query.dto';

/**
 * 路由：财务资金统计（GET /dashboard/finance）。
 * 需 dashboard:finance 权限。
 */
@Controller('dashboard/finance')
export class FinanceStatsController {
  constructor(private readonly useCase: GetFinanceStatsUseCase) {}

  @Get()
  @Permissions(PERMS.dashboard.finance)
  get(@Query() query: StatsQueryDto): Promise<FinanceStatsView> {
    return this.useCase.execute(query.range);
  }
}
