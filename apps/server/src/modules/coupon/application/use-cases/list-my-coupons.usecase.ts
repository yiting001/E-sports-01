import { Inject, Injectable } from '@nestjs/common';
import { UserCouponView } from '@app/contracts';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';
import { toUserCouponView } from '../coupon.mapper';

/** 用例：我的优惠券列表（含已使用/已过期，前端分组展示） */
@Injectable()
export class ListMyCouponsUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  async execute(userId: string): Promise<UserCouponView[]> {
    const now = new Date();
    const rows = await this.repo.findByUser(userId);
    return rows.map((row) => toUserCouponView(row, now));
  }
}
