import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AdminOrderView, PERMS } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { RejectOrderRefundUseCase } from '../../application/use-cases/reject-order-refund.usecase';
import { RejectOrderRefundDto } from '../dto/reject-order-refund.dto';

/** 路由：后台驳回待审核退款（POST /order/admin/:id/refund/reject）。 */
@Controller('order')
export class OrderAdminRefundRejectController {
  constructor(private readonly useCase: RejectOrderRefundUseCase) {}

  @Post('admin/:id/refund/reject')
  @Permissions(PERMS.order.refundReview)
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectOrderRefundDto,
  ): Promise<AdminOrderView> {
    return this.useCase.execute(user.id, id, dto.reason);
  }
}
