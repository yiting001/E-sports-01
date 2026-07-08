import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CouponCodeView } from '@app/contracts';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';
import { toCouponCodeView } from '../coupon.mapper';

/** 用例：按分发码查看券信息（C 端分发链接落地页，附我已领张数） */
@Injectable()
export class GetCouponByCodeUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  async execute(userId: string, code: string): Promise<CouponCodeView> {
    const distributor = await this.repo.findDistributorByCode(code);
    if (!distributor) {
      throw new NotFoundException('分发链接无效或已失效');
    }
    const coupon = await this.repo.findById(distributor.couponId);
    if (!coupon || !coupon.enabled) {
      throw new NotFoundException('优惠券不存在或已下架');
    }
    const claimedByMe = await this.repo.countClaimed(userId, coupon.id);
    return toCouponCodeView(coupon, claimedByMe, code);
  }
}
