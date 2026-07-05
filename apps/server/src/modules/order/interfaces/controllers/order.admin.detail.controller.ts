import { Controller, Get, Param } from '@nestjs/common';
import { AdminOrderView, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { GetAdminOrderUseCase } from '../../application/use-cases/get-admin-order.usecase';

/**
 * 路由：管理端查询单笔订单详情（GET /order/admin/:id）。
 * 需 order:admin:detail 权限。
 */
@Controller('order')
export class OrderAdminDetailController {
  constructor(private readonly useCase: GetAdminOrderUseCase) {}

  @Get('admin/:id')
  @Permissions(PERMS.order.detail)
  detail(@Param('id') id: string): Promise<AdminOrderView> {
    return this.useCase.execute(id);
  }
}
