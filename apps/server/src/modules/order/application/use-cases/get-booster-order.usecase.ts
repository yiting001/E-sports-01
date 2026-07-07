import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrderView } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { BoosterAccess } from '../booster-access.service';
import { toOrderView } from '../order.mapper';

/** 用例：打手查看自己接下的单笔订单详情（接单后账号信息可见） */
@Injectable()
export class GetBoosterOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly boosterAccess: BoosterAccess,
  ) {}

  async execute(userId: string, id: string): Promise<OrderView> {
    await this.boosterAccess.assert(userId);
    const order = await this.orders.findById(id);
    if (!order || order.boosterId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    return toOrderView(order);
  }
}
