import { Controller, Get, Query } from '@nestjs/common';
import { OrderView, PaginatedResult } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { ListMyOrdersUseCase } from '../../application/use-cases/list-my-orders.usecase';

/** 路由：分页查询我的订单（GET /order/mine）；仅登录态 */
@Controller('order')
export class OrderMineListController {
  constructor(private readonly useCase: ListMyOrdersUseCase) {}

  @Get('mine')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<OrderView>> {
    return this.useCase.execute(
      user.id,
      query.page,
      query.pageSize,
      query.skip,
    );
  }
}
