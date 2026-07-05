import { Controller, Get, Param } from '@nestjs/common';
import { AdminOrderView, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { GetAdminOrderUseCase } from '../../application/use-cases/get-admin-order.usecase';

/**
 * 路由：管理端查询单笔订单详情（GET /order/admin/:id）。
 * 需 order:admin:detail 权限；客服仅限自己负责的订单。
 */
@Controller('order')
export class OrderAdminDetailController {
  constructor(private readonly useCase: GetAdminOrderUseCase) {}

  @Get('admin/:id')
  @Permissions(PERMS.order.detail)
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<AdminOrderView> {
    return this.useCase.execute(user.id, id);
  }
}
