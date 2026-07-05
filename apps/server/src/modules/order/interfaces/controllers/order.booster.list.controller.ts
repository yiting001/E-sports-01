import { Controller, Get, Query } from '@nestjs/common';
import { OrderView, PaginatedResult } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { OrderMineListQueryDto } from '../dto/order-mine-list-query.dto';
import { ListBoosterOrdersUseCase } from '../../application/use-cases/list-booster-orders.usecase';

/**
 * 路由：打手分页查询自己接下的订单（GET /order/booster/mine，可按状态过滤）；
 * 仅打手角色可访问。
 */
@Controller('order')
export class OrderBoosterListController {
  constructor(private readonly useCase: ListBoosterOrdersUseCase) {}

  @Get('booster/mine')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: OrderMineListQueryDto,
  ): Promise<PaginatedResult<OrderView>> {
    return this.useCase.execute(
      user.id,
      query.page,
      query.pageSize,
      query.skip,
      query.status,
    );
  }
}
