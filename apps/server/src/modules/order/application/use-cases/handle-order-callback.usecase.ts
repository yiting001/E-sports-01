import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentProvider } from '@app/contracts';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductEntity } from '../../../commerce/domain/product.entity';
import { PaymentCallbackRequest } from '../../../wallet/domain/payment-port.interface';
import { PaymentResolver } from '../../../wallet/application/payment.resolver';
import { OrderEntity } from '../../domain/order.entity';

/**
 * 用例：处理订单支付异步回调。
 * 按渠道验签解析 → 事务内以 orderNo 幂等定位订单：仅「待付款且金额一致」时
 * 标记已支付进入「待客服处理」，并累加商品销量；重复回调直接应答成功。
 */
@Injectable()
export class HandleOrderCallbackUseCase {
  constructor(
    private readonly paymentResolver: PaymentResolver,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(
    provider: PaymentProvider,
    req: PaymentCallbackRequest,
  ): Promise<string> {
    const port = this.paymentResolver.resolve(provider);
    const result = await port.parseCallback(req);
    if (result.success) {
      await this.markPaid(
        result.outTradeNo,
        result.providerTradeNo,
        result.paidAmountFen,
      );
    }
    return port.callbackAck();
  }

  /** 事务 + 行锁内幂等落账：待付款 → 待客服处理，并累加商品销量 */
  private async markPaid(
    orderNo: string,
    providerTradeNo: string,
    paidAmountFen: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      const order = await m.getRepository(OrderEntity).findOne({
        where: { orderNo },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !order ||
        order.status !== OrderStatus.PendingPayment ||
        order.amountFen !== paidAmountFen
      ) {
        return;
      }
      order.status = OrderStatus.PendingService;
      order.providerTradeNo = providerTradeNo;
      order.paidAt = new Date();
      await m.getRepository(OrderEntity).save(order);
      await m
        .getRepository(ProductEntity)
        .increment({ id: order.productId }, 'sold', order.quantity);
    });
  }
}
