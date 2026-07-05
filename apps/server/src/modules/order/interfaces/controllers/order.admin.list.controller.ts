import { Controller, Get, Query } from '@nestjs/common';
import { AdminOrderView, PaginatedResult, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ListAdminOrdersUseCase } from '../../application/use-cases/list-admin-orders.usecase';
import { OrderAdminListQueryDto } from '../dto/order-admin-list-query.dto';

/**
 * 路由：管理端分页检索订单（GET /order/admin），可按状态/订单号过滤。
 * 需 order:admin:list 权限；客服角色仅见自己负责商品的订单。
 */
@Controller('order')
export class OrderAdminListController {
  constructor(private readonly useCase: ListAdminOrdersUseCase) {}

  @Get('admin')
  @Permissions(PERMS.order.list)
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: OrderAdminListQueryDto,
  ): Promise<PaginatedResult<AdminOrderView>> {
    return this.useCase.execute(
      user.id,
      query.page,
      query.pageSize,
      query.skip,
      { status: query.status, orderNo: query.orderNo },
    );
  }
}
