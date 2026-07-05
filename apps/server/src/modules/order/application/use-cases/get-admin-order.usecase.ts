import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminOrderView } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { toAdminOrderView } from '../order.mapper';

/** 用例：管理端查询单笔订单详情 */
@Injectable()
export class GetAdminOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
  ) {}

  async execute(id: string): Promise<AdminOrderView> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    return toAdminOrderView(order);
  }
}
