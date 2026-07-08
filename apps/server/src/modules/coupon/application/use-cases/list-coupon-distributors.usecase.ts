import { Inject, Injectable } from '@nestjs/common';
import { CouponDistributorView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';

/** 用例：某券的分发人列表（管理端，附用户资料与经其发放的张数） */
@Injectable()
export class ListCouponDistributorsUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(couponId: string): Promise<CouponDistributorView[]> {
    const distributors = await this.repo.findDistributors(couponId);
    const profiles = await this.users.resolveProfiles(
      distributors.map((d) => d.userId),
    );
    return Promise.all(
      distributors.map(async (d) => {
        const profile = profiles.get(d.userId);
        return {
          id: d.id,
          userId: d.userId,
          username: profile?.username ?? '',
          nickname: profile?.nickname ?? '',
          code: d.code,
          claimedCount: await this.repo.countClaimedViaDistributor(
            couponId,
            d.userId,
          ),
          createdAt: d.createdAt.toISOString(),
        };
      }),
    );
  }
}
