import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { OrderView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { RequestOrderRefundUseCase } from '../../application/use-cases/request-order-refund.usecase';
import { RequestOrderRefundDto } from '../dto/request-order-refund.dto';

/** 路由：订单本人申请全额退款（POST /order/:id/refund）。 */
@Controller('order')
export class OrderRefundRequestController {
  constructor(private readonly useCase: RequestOrderRefundUseCase) {}

  @Post(':id/refund')
  request(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestOrderRefundDto,
  ): Promise<OrderView> {
    return this.useCase.execute(user.id, id, dto.reason);
  }
}
