import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AdminOrderView, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { DispatchOrderUseCase } from '../../application/use-cases/dispatch-order.usecase';

/**
 * 路由：客服把订单下发到接单大厅（POST /order/admin/:id/dispatch）。
 * 需 order:admin:dispatch 权限；仅「待客服处理」订单可下发。
 */
@Controller('order')
export class OrderAdminDispatchController {
  constructor(private readonly useCase: DispatchOrderUseCase) {}

  @Post('admin/:id/dispatch')
  @Permissions(PERMS.order.dispatch)
  dispatch(@Param('id', ParseUUIDPipe) id: string): Promise<AdminOrderView> {
    return this.useCase.execute(id);
  }
}
