import { Inject, Injectable } from '@nestjs/common';
import { CouponView, PaginatedResult } from '@app/contracts';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';
import { toCouponView } from '../coupon.mapper';

/** 用例：管理端分页查询优惠券列表 */
@Injectable()
export class ListCouponsUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<CouponView>> {
    const [rows, total] = await this.repo.paginate(skip, pageSize);
    return { list: rows.map(toCouponView), total, page, pageSize };
  }
}
