import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminOrderView } from '@app/contracts';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order-repository.interface';
import {
  ORDER_REFUND_TRANSACTION,
  OrderRefundTransaction,
} from '../../domain/order-refund-transaction.interface';
import { OrderGroupService } from '../order-group.service';
import { toAdminOrderView } from '../order.mapper';
import { ServiceAgentScope } from '../service-agent-scope.service';

/** 后台驳回待审核退款，恢复申请前履约状态。 */
@Injectable()
export class RejectOrderRefundUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(ORDER_REFUND_TRANSACTION)
    private readonly refunds: OrderRefundTransaction,
    private readonly scope: ServiceAgentScope,
    private readonly orderGroup: OrderGroupService,
  ) {}

  async execute(reviewerId: string, orderId: string, reason: string): Promise<AdminOrderView> {
    const order = await this.orders.findById(orderId);
    if (!order || !order.refund) {
      throw new NotFoundException('退款申请不存在');
    }
    await this.scope.assertCanHandle(reviewerId, order);
    const result = await this.refunds.reject({
      tenantId: order.tenantId,
      orderId: order.id,
      reviewerId,
      reason,
    });
    if (result.outcome === 'not_found') {
      throw new NotFoundException('退款申请不存在');
    }
    if (result.outcome === 'invalid_status') {
      throw new BadRequestException('仅待审核退款申请可驳回');
    }
    await this.orderGroup.syncTitle(result.order);
    return toAdminOrderView(result.order);
  }
}
