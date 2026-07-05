import { Controller, Get, Query } from '@nestjs/common';
import { OrderStatsView, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { GetOrderStatsUseCase } from '../../application/use-cases/get-order-stats.usecase';
import { StatsQueryDto } from '../dto/stats-query.dto';

/**
 * 路由：订单运营统计（GET /dashboard/orders）。
 * 需 dashboard:orders 权限。
 */
@Controller('dashboard/orders')
export class OrderStatsController {
  constructor(private readonly useCase: GetOrderStatsUseCase) {}

  @Get()
  @Permissions(PERMS.dashboard.orders)
  get(@Query() query: StatsQueryDto): Promise<OrderStatsView> {
    return this.useCase.execute(query.range);
  }
}
