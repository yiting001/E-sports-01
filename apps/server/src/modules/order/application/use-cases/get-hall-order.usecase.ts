import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, OrderView } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { BoosterAccess } from '../booster-access.service';
import { toHallOrderView } from '../order.mapper';

/** 用例：打手查看接单大厅单笔订单详情（仅限待接单订单；账号信息接单前不可见） */
@Injectable()
export class GetHallOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly boosterAccess: BoosterAccess,
  ) {}

  async execute(userId: string, id: string): Promise<OrderView> {
    await this.boosterAccess.assert(userId);
    const order = await this.orders.findById(id);
    if (!order || order.status !== OrderStatus.Dispatching) {
      throw new NotFoundException('订单不存在或已被接走');
    }
    return toHallOrderView(order);
  }
}
