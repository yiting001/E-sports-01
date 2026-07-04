import { Controller, Param, Post } from '@nestjs/common';
import { OrderView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { CancelMyOrderUseCase } from '../../application/use-cases/cancel-my-order.usecase';

/** 路由：取消我的待付款订单（POST /order/:id/cancel）；仅本人可操作 */
@Controller('order')
export class OrderCancelController {
  constructor(private readonly useCase: CancelMyOrderUseCase) {}

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderView> {
    return this.useCase.execute(user.id, id);
  }
}
