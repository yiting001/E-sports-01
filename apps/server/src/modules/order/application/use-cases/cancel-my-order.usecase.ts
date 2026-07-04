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
import { toOrderView } from '../order.mapper';

/** 用例：取消我的订单（仅「待付款」可取消，已支付订单走后续售后流程） */
@Injectable()
export class CancelMyOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
  ) {}

  async execute(userId: string, id: string): Promise<OrderView> {
    const order = await this.orders.findById(id);
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.PendingPayment) {
      throw new BadRequestException('仅待付款订单可取消');
    }
    order.status = OrderStatus.Cancelled;
    return toOrderView(await this.orders.save(order));
  }
}
