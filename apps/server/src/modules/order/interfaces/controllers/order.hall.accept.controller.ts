import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { OrderView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { AcceptHallOrderUseCase } from '../../application/use-cases/accept-hall-order.usecase';

/** 路由：打手在接单大厅接单（POST /order/hall/:id/accept）；仅打手角色可访问 */
@Controller('order')
export class OrderHallAcceptController {
  constructor(private readonly useCase: AcceptHallOrderUseCase) {}

  @Post('hall/:id/accept')
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderView> {
    return this.useCase.execute(user.id, id);
  }
}
