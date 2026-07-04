import { Controller, Get, Param } from '@nestjs/common';
import { OrderView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { GetMyOrderUseCase } from '../../application/use-cases/get-my-order.usecase';

/** 路由：查询我的单笔订单（GET /order/:id），支付结果轮询/详情用；仅本人可见 */
@Controller('order')
export class OrderMineDetailController {
  constructor(private readonly useCase: GetMyOrderUseCase) {}

  @Get(':id')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderView> {
    return this.useCase.execute(user.id, id);
  }
}
