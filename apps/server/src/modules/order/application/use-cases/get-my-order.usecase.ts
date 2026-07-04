import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrderView } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { toOrderView } from '../order.mapper';

/** 用例：查询我的单笔订单（支付结果轮询/详情用），仅本人可见 */
@Injectable()
export class GetMyOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
  ) {}

  async execute(userId: string, id: string): Promise<OrderView> {
    const order = await this.orders.findById(id);
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    return toOrderView(order);
  }
}
