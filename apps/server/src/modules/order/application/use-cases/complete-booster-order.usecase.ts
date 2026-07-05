import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderView } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { BoosterAccess } from '../booster-access.service';
import { toOrderView } from '../order.mapper';

/** 用例：打手完成服务（服务中 → 已完成，仅限本人接下的订单） */
@Injectable()
export class CompleteBoosterOrderUseCase {
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
    if (order.status !== OrderStatus.Serving) {
      throw new BadRequestException('仅「服务中」订单可完成');
    }
    order.status = OrderStatus.Completed;
    return toOrderView(await this.orders.save(order));
  }
}
