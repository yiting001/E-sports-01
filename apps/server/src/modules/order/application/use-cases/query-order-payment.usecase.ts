import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, OrderView } from '@app/contracts';
import { PaymentResolver } from '../../../wallet/application/payment.resolver';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { toOrderView } from '../order.mapper';
import { OrderPaymentSettleService } from '../order-payment.service';

/**
 * 用例：主动查询订单支付结果（异步回调未达时的兜底确认）。
 * 待付款订单调用渠道官方查单接口（alipay.trade.query / 微信商户订单号查单），
 * 查到已支付即走与回调相同的幂等落账口，返回最新订单视图供前端结束轮询。
 */
@Injectable()
export class QueryOrderPaymentUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly paymentResolver: PaymentResolver,
    private readonly settle: OrderPaymentSettleService,
  ) {}

  async execute(userId: string, id: string): Promise<OrderView> {
    const order = await this.orders.findById(id);
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.PendingPayment) {
      return toOrderView(order);
    }
    const port = this.paymentResolver.resolve(order.provider);
    const result = await port.queryTrade(order.orderNo);
    if (result.paid) {
      await this.settle.markPaid(
        order.orderNo,
        result.providerTradeNo,
        result.paidAmountFen,
      );
      const settled = await this.orders.findById(id);
      return toOrderView(settled ?? order);
    }
    return toOrderView(order);
  }
}
