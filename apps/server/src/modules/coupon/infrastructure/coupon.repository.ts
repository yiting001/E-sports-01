import { Injectable } from '@nestjs/common';
import { UserCouponStatus } from '@app/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThan, type Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { CouponEntity } from '../domain/coupon.entity';
import { UserCouponEntity } from '../domain/user-coupon.entity';
import { CouponRepository } from '../domain/coupon-repository.interface';

/** 优惠券仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormCouponRepository implements CouponRepository {
  constructor(
    @InjectRepository(CouponEntity)
    private readonly coupons: Repository<CouponEntity>,
    @InjectRepository(UserCouponEntity)
    private readonly userCoupons: Repository<UserCouponEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findById(id: string): Promise<CouponEntity | null> {
    return this.coupons.findOne({
      where: withTenant<CouponEntity>(this.tenant, { id }),
    });
  }

  paginate(skip: number, take: number): Promise<[CouponEntity[], number]> {
    return this.coupons.findAndCount({
      where: withTenant<CouponEntity>(this.tenant, {}),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  findClaimable(now: Date): Promise<CouponEntity[]> {
    return this.coupons.find({
      where: withTenant<CouponEntity>(this.tenant, {
        enabled: true,
        validFrom: LessThanOrEqual(now),
        validTo: MoreThan(now),
      }),
      order: { validTo: 'ASC' },
    });
  }

  create(data: Partial<CouponEntity>): CouponEntity {
    return this.coupons.create(data);
  }

  save(entity: CouponEntity): Promise<CouponEntity> {
    return this.coupons.save(entity);
  }

  async remove(entity: CouponEntity): Promise<void> {
    await this.coupons.remove(entity);
  }

  async tryIncrementIssued(couponId: string): Promise<boolean> {
    const result = await this.coupons
      .createQueryBuilder()
      .update()
      .set({ issuedCount: () => '"issued_count" + 1' })
      .where('id = :couponId AND "issued_count" < "total_count"', { couponId })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async decrementIssued(couponId: string): Promise<void> {
    await this.coupons.decrement({ id: couponId }, 'issuedCount', 1);
  }

  countClaimed(userId: string, couponId: string): Promise<number> {
    return this.userCoupons.count({
      where: withTenant<UserCouponEntity>(this.tenant, { userId, couponId }),
    });
  }

  async countClaimedBatch(
    userId: string,
    couponIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (couponIds.length === 0) {
      return map;
    }
    const rows = await this.userCoupons.find({
      where: withTenant<UserCouponEntity>(this.tenant, {
        userId,
        couponId: In(couponIds),
      }),
      select: ['couponId'],
    });
    for (const row of rows) {
      map.set(row.couponId, (map.get(row.couponId) ?? 0) + 1);
    }
    return map;
  }

  findByUser(userId: string): Promise<UserCouponEntity[]> {
    return this.userCoupons.find({
      where: withTenant<UserCouponEntity>(this.tenant, { userId }),
      order: { createdAt: 'DESC' },
    });
  }

  findUserCouponById(id: string): Promise<UserCouponEntity | null> {
    return this.userCoupons.findOne({
      where: withTenant<UserCouponEntity>(this.tenant, { id }),
    });
  }

  createUserCoupon(data: Partial<UserCouponEntity>): UserCouponEntity {
    return this.userCoupons.create(data);
  }

  saveUserCoupon(entity: UserCouponEntity): Promise<UserCouponEntity> {
    return this.userCoupons.save(entity);
  }

  async markUsed(userCouponId: string, orderId: string): Promise<boolean> {
    const result = await this.userCoupons.update(
      { id: userCouponId, status: UserCouponStatus.Unused },
      { status: UserCouponStatus.Used, usedOrderId: orderId },
    );
    return (result.affected ?? 0) > 0;
  }

  async restoreByOrder(orderId: string): Promise<void> {
    await this.userCoupons.update(
      { usedOrderId: orderId, status: UserCouponStatus.Used },
      { status: UserCouponStatus.Unused, usedOrderId: null },
    );
  }
}
