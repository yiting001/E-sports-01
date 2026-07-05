import { Controller, Get, Param } from '@nestjs/common';
import { OrderView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { QueryOrderPaymentUseCase } from '../../application/use-cases/query-order-payment.usecase';

/**
 * 路由：主动查询订单支付结果（GET /order/:id/pay/query）。
 * 仅本人可查；待付款时调渠道官方查单接口兜底确认，已支付即幂等落账并返回最新状态。
 */
@Controller('order')
export class OrderPayQueryController {
  constructor(private readonly useCase: QueryOrderPaymentUseCase) {}

  @Get(':id/pay/query')
  query(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderView> {
    return this.useCase.execute(user.id, id);
  }
}
