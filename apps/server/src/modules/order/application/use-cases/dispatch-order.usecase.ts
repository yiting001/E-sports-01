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
import { assertOrderCanDispatch } from '../order-booster-selection';
import { ServiceAgentScope } from '../service-agent-scope.service';

/** 用例：客服把「待客服处理」订单下发到接单大厅（→ 待接单；客服仅限自己负责的订单） */
@Injectable()
export class DispatchOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly scope: ServiceAgentScope,
  ) {}

  async execute(operatorId: string, id: string): Promise<AdminOrderView> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    await this.scope.assertCanHandle(operatorId, order);
    if (order.status !== OrderStatus.PendingService) {
      throw new BadRequestException('仅「待客服处理」订单可下发大厅');
    }
    assertOrderCanDispatch(order);
    order.status = OrderStatus.Dispatching;
    order.dispatchedAt = new Date();
    return toAdminOrderView(await this.orders.save(order));
  }
}
