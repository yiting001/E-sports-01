import { Controller, Get, Param } from '@nestjs/common';
import { OrderView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { GetBoosterOrderUseCase } from '../../application/use-cases/get-booster-order.usecase';

/**
 * 路由：打手查看自己接下的订单详情（GET /order/booster/mine/:id）；
 * 仅打手角色可访问，仅限本人接下的订单。
 */
@Controller('order')
export class OrderBoosterDetailController {
  constructor(private readonly useCase: GetBoosterOrderUseCase) {}

  @Get('booster/mine/:id')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderView> {
    return this.useCase.execute(user.id, id);
  }
}
