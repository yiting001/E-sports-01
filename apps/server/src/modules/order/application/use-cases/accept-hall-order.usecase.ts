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

/** 用例：打手在接单大厅接单（待接单 → 服务中，回填接单打手） */
@Injectable()
export class AcceptHallOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly boosterAccess: BoosterAccess,
  ) {}

  async execute(userId: string, id: string): Promise<OrderView> {
    await this.boosterAccess.assert(userId);
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.Dispatching) {
      throw new BadRequestException('该订单已被接走或不可接单');
    }
    if (order.userId === userId) {
      throw new BadRequestException('不能接自己的订单');
    }
    order.status = OrderStatus.Serving;
    order.boosterId = userId;
    return toOrderView(await this.orders.save(order));
  }
}
