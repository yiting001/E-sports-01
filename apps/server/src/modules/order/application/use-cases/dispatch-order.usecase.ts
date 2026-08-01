import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminOrderView, OrderStatus } from '@app/contracts';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order-repository.interface';
import { toAdminOrderView } from '../order.mapper';
import { assertOrderCanDispatch } from '../order-booster-selection';
import { OrderGroupService } from '../order-group.service';
import { OrderNotifyService } from '../order-notify.service';
import { ServiceAgentScope } from '../service-agent-scope.service';

/** 用例：客服把「待客服处理」订单下发到接单大厅（→ 待接单；客服仅限自己负责的订单） */
@Injectable()
export class DispatchOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly scope: ServiceAgentScope,
    private readonly orderGroup: OrderGroupService,
    private readonly orderNotify: OrderNotifyService,
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
    const saved = await this.orders.claimForDispatch({
      orderId: order.id,
      tenantId: order.tenantId,
      dispatchedAt: new Date(),
    });
    if (!saved) {
      throw new ConflictException('订单状态已变化，请刷新后重试');
    }
    await this.orderGroup.syncTitle(saved);
    await this.orderNotify.notifyHallOrder(saved);
    return toAdminOrderView(saved);
  }
}
