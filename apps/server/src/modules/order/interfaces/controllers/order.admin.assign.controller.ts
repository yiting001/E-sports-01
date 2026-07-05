import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AdminOrderView, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { AssignOrderBoosterUseCase } from '../../application/use-cases/assign-order-booster.usecase';
import { AssignOrderDto } from '../dto/assign-order.dto';

/**
 * 路由：客服指派指定打手完成订单（POST /order/admin/:id/assign）。
 * 需 order:admin:assign 权限；客服仅限自己负责的订单。
 */
@Controller('order')
export class OrderAdminAssignController {
  constructor(private readonly useCase: AssignOrderBoosterUseCase) {}

  @Post('admin/:id/assign')
  @Permissions(PERMS.order.assign)
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignOrderDto,
  ): Promise<AdminOrderView> {
    return this.useCase.execute(user.id, id, dto.boosterId);
  }
}
