import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderView } from '@app/contracts';
import { CouponRedeemService } from '../../../coupon/application/coupon-redeem.service';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { toOrderView } from '../order.mapper';

/** 用例：取消我的订单（仅「待付款」可取消），用过券的订单同步回退优惠券 */
@Injectable()
export class CancelMyOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly couponRedeem: CouponRedeemService,
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
    order.cancelledAt = new Date();
    const saved = await this.orders.save(order);
    if (order.userCouponId) {
      await this.couponRedeem.restoreByOrder(order.id);
    }
    return toOrderView(saved);
  }
}
