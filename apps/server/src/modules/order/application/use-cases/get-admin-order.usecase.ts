import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminOrderView } from '@app/contracts';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order-repository.interface';
import { toAdminOrderView } from '../order.mapper';
import { OrderPaymentSettleService } from '../order-payment.service';
import { ServiceAgentScope } from '../service-agent-scope.service';

/** 用例：管理端查询单笔订单详情（客服仅限自己负责的订单） */
@Injectable()
export class GetAdminOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly scope: ServiceAgentScope,
    private readonly payment: OrderPaymentSettleService,
  ) {}

  async execute(operatorId: string, id: string): Promise<AdminOrderView> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    await this.scope.assertCanHandle(operatorId, order);
    await this.payment.ensurePaidOrderGroup(order);
    return toAdminOrderView(order);
  }
}
