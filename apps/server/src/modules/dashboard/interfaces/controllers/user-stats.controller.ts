import { Controller, Get, Query } from '@nestjs/common';
import { PERMS, UserStatsView } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { GetUserStatsUseCase } from '../../application/use-cases/get-user-stats.usecase';
import { StatsQueryDto } from '../dto/stats-query.dto';

/**
 * 路由：用户增长统计（GET /dashboard/users）。
 * 需 dashboard:users 权限。
 */
@Controller('dashboard/users')
export class UserStatsController {
  constructor(private readonly useCase: GetUserStatsUseCase) {}

  @Get()
  @Permissions(PERMS.dashboard.users)
  get(@Query() query: StatsQueryDto): Promise<UserStatsView> {
    return this.useCase.execute(query.range);
  }
}
