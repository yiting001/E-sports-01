import { Inject, Injectable } from '@nestjs/common';
import { CouponPublicView } from '@app/contracts';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';
import { toCouponPublicView } from '../coupon.mapper';

/** 用例：领券中心列表（上架且在有效期内的券，附我已领张数） */
@Injectable()
export class ListClaimableCouponsUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  async execute(userId: string): Promise<CouponPublicView[]> {
    const coupons = await this.repo.findClaimable(new Date());
    const claimed = await this.repo.countClaimedBatch(
      userId,
      coupons.map((c) => c.id),
    );
    return coupons.map((c) => toCouponPublicView(c, claimed.get(c.id) ?? 0));
  }
}
