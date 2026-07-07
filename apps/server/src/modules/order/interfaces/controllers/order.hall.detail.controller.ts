import { Controller, Get, Param } from '@nestjs/common';
import { OrderView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { GetHallOrderUseCase } from '../../application/use-cases/get-hall-order.usecase';

/** 路由：打手查看接单大厅订单详情（GET /order/hall/:id）；仅打手角色可访问 */
@Controller('order')
export class OrderHallDetailController {
  constructor(private readonly useCase: GetHallOrderUseCase) {}

  @Get('hall/:id')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderView> {
    return this.useCase.execute(user.id, id);
  }
}
