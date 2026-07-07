import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserCouponStatus } from '@app/contracts';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../domain/coupon-repository.interface';

/**
 * 系统发券服务（供邀请奖励等系统场景跨模块调用）。
 * 与用户主动领取不同：不受单人限领约束（由业务场景自行控制次数），
 * 但仍校验上架/有效期并条件自增已领数杜绝超发；落库失败回滚补偿。
 */
@Injectable()
export class CouponGrantService {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  /** 查询券模板券名（存在且上架返回券名，否则 null；供奖励配置校验/文案用） */
  async titleOf(couponId: string): Promise<string | null> {
    const coupon = await this.repo.findById(couponId);
    return coupon && coupon.enabled ? coupon.title : null;
  }

  /** 向指定用户发放一张券，返回券名（用于奖励说明快照） */
  async grant(userId: string, couponId: string): Promise<string> {
    const now = new Date();
    const coupon = await this.repo.findById(couponId);
    if (!coupon || !coupon.enabled) {
      throw new NotFoundException('优惠券不存在或已下架');
    }
    if (now < coupon.validFrom || now >= coupon.validTo) {
      throw new BadRequestException('优惠券不在有效期内');
    }
    const granted = await this.repo.tryIncrementIssued(couponId);
    if (!granted) {
      throw new BadRequestException('优惠券库存不足');
    }
    try {
      await this.repo.saveUserCoupon(
        this.repo.createUserCoupon({
          userId,
          couponId,
          title: coupon.title,
          type: coupon.type,
          value: coupon.value,
          thresholdFen: coupon.thresholdFen,
          expiresAt: coupon.validTo,
          status: UserCouponStatus.Unused,
          usedOrderId: null,
        }),
      );
      return coupon.title;
    } catch (err) {
      await this.repo.decrementIssued(couponId);
      throw err;
    }
  }
}
