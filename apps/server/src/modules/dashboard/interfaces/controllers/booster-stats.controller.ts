import { Controller, Get, Query } from '@nestjs/common';
import { BoosterStatsView, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { GetBoosterStatsUseCase } from '../../application/use-cases/get-booster-stats.usecase';
import { StatsQueryDto } from '../dto/stats-query.dto';

/**
 * 路由：打手生态统计（GET /dashboard/boosters）。
 * 需 dashboard:boosters 权限。
 */
@Controller('dashboard/boosters')
export class BoosterStatsController {
  constructor(private readonly useCase: GetBoosterStatsUseCase) {}

  @Get()
  @Permissions(PERMS.dashboard.boosters)
  get(@Query() query: StatsQueryDto): Promise<BoosterStatsView> {
    return this.useCase.execute(query.range);
  }
}
