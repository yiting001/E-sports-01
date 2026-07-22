import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AdminOrderView, PERMS } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { ApproveOrderRefundUseCase } from '../../application/use-cases/approve-order-refund.usecase';

/** 路由：后台同意/查询/重试退款（POST /order/admin/:id/refund/approve）。 */
@Controller('order')
export class OrderAdminRefundApproveController {
  constructor(private readonly useCase: ApproveOrderRefundUseCase) {}

  @Post('admin/:id/refund/approve')
  @Permissions(PERMS.order.refundReview)
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminOrderView> {
    return this.useCase.execute(user.id, id);
  }
}
