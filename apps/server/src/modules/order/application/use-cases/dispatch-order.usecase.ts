import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminOrderView, OrderStatus } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { toAdminOrderView } from '../order.mapper';

/** 用例：客服把「待客服处理」订单下发到接单大厅（→ 待接单） */
@Injectable()
export class DispatchOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
  ) {}

  async execute(id: string): Promise<AdminOrderView> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.PendingService) {
      throw new BadRequestException('仅「待客服处理」订单可下发大厅');
    }
    order.status = OrderStatus.Dispatching;
    return toAdminOrderView(await this.orders.save(order));
  }
}
