import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { OrderView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { CompleteBoosterOrderUseCase } from '../../application/use-cases/complete-booster-order.usecase';

/** 路由：打手完成服务（POST /order/booster/:id/complete）；仅限本人接下的订单 */
@Controller('order')
export class OrderBoosterCompleteController {
  constructor(private readonly useCase: CompleteBoosterOrderUseCase) {}

  @Post('booster/:id/complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderView> {
    return this.useCase.execute(user.id, id);
  }
}
