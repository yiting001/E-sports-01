import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';

/** 用例：删除优惠券模板（已领出的用户券为快照，不受删除影响） */
@Injectable()
export class RemoveCouponUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('优惠券不存在');
    }
    await this.repo.remove(entity);
  }
}
