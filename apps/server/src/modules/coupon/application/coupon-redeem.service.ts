import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserCouponStatus, calcCouponDeductionFen } from '@app/contracts';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../domain/coupon-repository.interface';

/**
 * 优惠券核销服务（供订单模块跨模块调用）。
 * 下单时校验持有/未用/未过期/门槛并计算抵扣额，条件核销防并发重复用券；
 * 取消订单时回退券为未使用（已过期不影响正确性，用时再校验）。
 */
@Injectable()
export class CouponRedeemService {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  /** 校验用户券可用性并返回抵扣金额（分）；不可用抛业务异常 */
  async resolveDeduction(
    userId: string,
    userCouponId: string,
    amountFen: number,
  ): Promise<number> {
    const coupon = await this.repo.findUserCouponById(userCouponId);
    if (!coupon || coupon.userId !== userId) {
      throw new NotFoundException('优惠券不存在');
    }
    if (coupon.status !== UserCouponStatus.Unused) {
      throw new BadRequestException('优惠券已被使用');
    }
    if (coupon.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('优惠券已过期');
    }
    const deduction = calcCouponDeductionFen(
      coupon.type,
      coupon.value,
      coupon.thresholdFen,
      amountFen,
    );
    if (deduction <= 0) {
      throw new BadRequestException('订单金额未达优惠券使用门槛');
    }
    return deduction;
  }

  /** 条件核销（未使用 → 已使用），并发重复用券时失败 */
  async redeem(userCouponId: string, orderId: string): Promise<void> {
    const used = await this.repo.markUsed(userCouponId, orderId);
    if (!used) {
      throw new BadRequestException('优惠券已被使用');
    }
  }

  /** 取消订单：回退该订单核销的券 */
  restoreByOrder(orderId: string): Promise<void> {
    return this.repo.restoreByOrder(orderId);
  }
}
