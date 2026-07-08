import { Inject, Injectable } from '@nestjs/common';
import { CouponShareView } from '@app/contracts';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';
import { toCouponShareView } from '../coupon.mapper';

/** 用例：我的推广券列表（C 端分发人查看自己可发放的券、分发码与发放进度） */
@Injectable()
export class ListMyDistributionsUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  async execute(userId: string): Promise<CouponShareView[]> {
    const distributors = await this.repo.findDistributorsByUser(userId);
    const coupons = await this.repo.findByIds(
      distributors.map((d) => d.couponId),
    );
    const byId = new Map(coupons.map((c) => [c.id, c]));
    const views: CouponShareView[] = [];
    for (const d of distributors) {
      const coupon = byId.get(d.couponId);
      if (!coupon) {
        continue;
      }
      const claimedCount = await this.repo.countClaimedViaDistributor(
        d.couponId,
        userId,
      );
      views.push(toCouponShareView(coupon, d.code, claimedCount));
    }
    return views;
  }
}
