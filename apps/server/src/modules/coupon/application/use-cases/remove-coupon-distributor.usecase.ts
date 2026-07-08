import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';

/** 用例：移除优惠券分发人（管理端；已领出的用户券不受影响） */
@Injectable()
export class RemoveCouponDistributorUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  async execute(couponId: string, distributorId: string): Promise<void> {
    const distributor = await this.repo.findDistributorById(distributorId);
    if (!distributor || distributor.couponId !== couponId) {
      throw new NotFoundException('分发人不存在');
    }
    await this.repo.removeDistributor(distributor);
  }
}
