import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, OrderView } from '@app/contracts';
import { CouponRedeemService } from '../../../coupon/application/coupon-redeem.service';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order-repository.interface';
import { toOwnerOrderView } from '../order.mapper';

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
    const saved = await this.orders.claimForCancellation({
      orderId: order.id,
      tenantId: order.tenantId,
      userId,
      cancelledAt: new Date(),
    });
    if (!saved) {
      throw new BadRequestException('订单状态已变化，请刷新后重试');
    }
    if (saved.userCouponId) {
      await this.couponRedeem.restoreByOrder(saved.id);
    }
    return toOwnerOrderView(saved);
  }
}
