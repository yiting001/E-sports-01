import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponView, UpsertCouponPayload } from '@app/contracts';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';
import { toCouponView } from '../coupon.mapper';

/** 用例：新建/编辑优惠券（id 为空则新建，否则更新；库存不得低于已领数） */
@Injectable()
export class SaveCouponUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
  ) {}

  async execute(payload: UpsertCouponPayload, id?: string): Promise<CouponView> {
    const validFrom = new Date(payload.validFrom);
    const validTo = new Date(payload.validTo);
    if (validTo.getTime() <= validFrom.getTime()) {
      throw new BadRequestException('有效期结束须晚于开始');
    }
    const data = { ...payload, validFrom, validTo };
    if (!id) {
      const created = this.repo.create(data);
      return toCouponView(await this.repo.save(created));
    }
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('优惠券不存在');
    }
    if (payload.totalCount < entity.issuedCount) {
      throw new BadRequestException('发行总量不得低于已领取张数');
    }
    Object.assign(entity, data);
    return toCouponView(await this.repo.save(entity));
  }
}
