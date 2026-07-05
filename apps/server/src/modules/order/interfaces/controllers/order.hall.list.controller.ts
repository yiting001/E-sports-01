import { Controller, Get, Query } from '@nestjs/common';
import { OrderView, PaginatedResult } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { ListHallOrdersUseCase } from '../../application/use-cases/list-hall-orders.usecase';

/** 路由：打手分页浏览接单大厅（GET /order/hall）；仅打手角色可访问 */
@Controller('order')
export class OrderHallListController {
  constructor(private readonly useCase: ListHallOrdersUseCase) {}

  @Get('hall')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<OrderView>> {
    return this.useCase.execute(user.id, query.page, query.pageSize, query.skip);
  }
}
