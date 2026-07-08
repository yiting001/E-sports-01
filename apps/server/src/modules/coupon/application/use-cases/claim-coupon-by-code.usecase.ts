import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserCouponView } from '@app/contracts';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';
import { ClaimCouponUseCase } from './claim-coupon.usecase';

/**
 * 用例：按分发码领取优惠券（C 端分发链接）。
 * 解析分发码定位券与分发人后复用通用领取流程，
 * 领取记录归因到分发人（user_coupon.distributorUserId）。
 */
@Injectable()
export class ClaimCouponByCodeUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
    private readonly claim: ClaimCouponUseCase,
  ) {}

  async execute(userId: string, code: string): Promise<UserCouponView> {
    const distributor = await this.repo.findDistributorByCode(code);
    if (!distributor) {
      throw new NotFoundException('分发链接无效或已失效');
    }
    return this.claim.execute(userId, distributor.couponId, distributor.userId);
  }
}
