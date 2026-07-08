import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponAudience, UserCouponStatus, UserCouponView } from '@app/contracts';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';
import { toUserCouponView } from '../coupon.mapper';

/**
 * 用例：领取优惠券。
 * 校验上架/有效期/单用户限领 → 条件自增已领数（杜绝超发）→
 * 固化券面快照落用户券；落库失败回滚已领数补偿。
 * 定向券仅限经分发链接领取（distributorUserId 归因到分发人）。
 */
@Injectable()
export class ClaimCouponUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  async execute(
    userId: string,
    couponId: string,
    distributorUserId?: string,
  ): Promise<UserCouponView> {
    const now = new Date();
    const coupon = await this.repo.findById(couponId);
    if (!coupon || !coupon.enabled) {
      throw new NotFoundException('优惠券不存在或已下架');
    }
    if (coupon.audience === CouponAudience.Directed && !distributorUserId) {
      throw new BadRequestException('该券为定向发放，请通过分发链接领取');
    }
    if (now < coupon.validFrom || now >= coupon.validTo) {
      throw new BadRequestException('优惠券不在可领取时间内');
    }
    const claimed = await this.repo.countClaimed(userId, couponId);
    if (claimed >= coupon.perUserLimit) {
      throw new BadRequestException('已达单人限领张数');
    }
    const granted = await this.repo.tryIncrementIssued(couponId);
    if (!granted) {
      throw new BadRequestException('手慢了，优惠券已被领完');
    }
    try {
      const userCoupon = this.repo.createUserCoupon({
        userId,
        couponId,
        title: coupon.title,
        type: coupon.type,
        value: coupon.value,
        thresholdFen: coupon.thresholdFen,
        expiresAt: coupon.validTo,
        status: UserCouponStatus.Unused,
        usedOrderId: null,
        distributorUserId: distributorUserId ?? null,
      });
      return toUserCouponView(await this.repo.saveUserCoupon(userCoupon), now);
    } catch (err) {
      await this.repo.decrementIssued(couponId);
      throw err;
    }
  }
}
