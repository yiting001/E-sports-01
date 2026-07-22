import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderView } from '@app/contracts';
import { buildOrderNo } from '../../../wallet/application/order-no.util';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order-repository.interface';
import { canRequestOrderRefund } from '../../domain/order-refund.rules';
import {
  ORDER_REFUND_TRANSACTION,
  OrderRefundTransaction,
} from '../../domain/order-refund-transaction.interface';
import { OrderGroupService } from '../order-group.service';
import { toOwnerOrderView } from '../order.mapper';

/** 本人申请未开工订单的全额退款；申请成功立即冻结履约。 */
@Injectable()
export class RequestOrderRefundUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(ORDER_REFUND_TRANSACTION)
    private readonly refunds: OrderRefundTransaction,
    private readonly orderGroup: OrderGroupService,
  ) {}

  async execute(userId: string, orderId: string, reason: string): Promise<OrderView> {
    const order = await this.orders.findById(orderId);
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    if (order.refund) {
      throw new ConflictException('该订单已提交过退款申请');
    }
    if (!canRequestOrderRefund(order.status)) {
      throw new BadRequestException('仅已付款且尚未开始服务的订单可申请退款');
    }

    const result = await this.refunds.request({
      tenantId: order.tenantId,
      orderId: order.id,
      userId,
      refundNo: buildOrderNo('R'),
      reason,
    });
    if (result.outcome === 'not_found') {
      throw new NotFoundException('订单不存在');
    }
    if (result.outcome === 'already_requested') {
      throw new ConflictException('该订单已提交过退款申请');
    }
    if (result.outcome === 'invalid_status') {
      throw new ConflictException('订单状态已变化，请刷新后重试');
    }
    await this.orderGroup.syncTitle(result.order);
    return toOwnerOrderView(result.order);
  }
}
