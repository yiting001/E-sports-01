import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@app/contracts';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductEntity } from '../../commerce/domain/product.entity';
import { MemberProgressService } from '../../member/application/member-progress.service';
import { OrderEntity } from '../domain/order.entity';
import { OrderGroupService } from './order-group.service';

/**
 * 订单支付落账服务（回调与主动查单共用的唯一落账口）。
 * 事务 + 行锁内以 orderNo 幂等定位订单：仅「待付款且金额一致」时
 * 标记已支付进入「待客服处理」，并累加商品销量与用户会员累计消费；
 * 落账后自动创建订单沟通群（用户 + 商品关联客服 + 平台管理员）；
 * 重复落账（回调与查单并发）安全无副作用。
 */
@Injectable()
export class OrderPaymentSettleService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly memberProgress: MemberProgressService,
    private readonly orderGroup: OrderGroupService,
  ) {}

  async markPaid(
    orderNo: string,
    providerTradeNo: string,
    paidAmountFen: number,
  ): Promise<void> {
    const paidOrder = await this.dataSource.transaction(async (m) => {
      const order = await m.getRepository(OrderEntity).findOne({
        where: { orderNo },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !order ||
        order.status !== OrderStatus.PendingPayment ||
        order.amountFen !== paidAmountFen
      ) {
        return null;
      }
      order.status = OrderStatus.PendingService;
      order.providerTradeNo = providerTradeNo;
      order.paidAt = new Date();
      await m.getRepository(OrderEntity).save(order);
      await m
        .getRepository(ProductEntity)
        .increment({ id: order.productId }, 'sold', order.quantity);
      return order;
    });
    if (paidOrder) {
      await this.memberProgress.recordSpend(paidOrder.userId, paidAmountFen);
      await this.orderGroup.ensureGroup(paidOrder);
    }
  }
}
