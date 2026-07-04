import { Body, Controller, Post } from '@nestjs/common';
import { CreateOrderResult } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.usecase';
import { CreateOrderDto } from '../dto/create-order.dto';

/** 路由：创建订单并发起扫码支付（POST /order）；仅登录态，所有角色可用 */
@Controller('order')
export class OrderCreateController {
  constructor(private readonly useCase: CreateOrderUseCase) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
  ): Promise<CreateOrderResult> {
    return this.useCase.execute(user.id, dto);
  }
}
