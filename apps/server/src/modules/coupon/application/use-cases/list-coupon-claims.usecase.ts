import { Inject, Injectable } from '@nestjs/common';
import { CouponClaimRecordView, PaginatedResult } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';

/** 用例：某券的领取记录分页（管理端，记录哪个用户领了、经哪个分发人） */
@Injectable()
export class ListCouponClaimsUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    couponId: string,
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<CouponClaimRecordView>> {
    const [rows, total] = await this.repo.paginateClaims(
      couponId,
      skip,
      pageSize,
    );
    const profiles = await this.users.resolveProfiles(
      rows.flatMap((r) => [r.userId, r.distributorUserId ?? '']),
    );
    const list = rows.map((r) => {
      const claimer = profiles.get(r.userId);
      const distributor = r.distributorUserId
        ? profiles.get(r.distributorUserId)
        : undefined;
      return {
        id: r.id,
        userId: r.userId,
        username: claimer?.username ?? '',
        nickname: claimer?.nickname ?? '',
        distributorUserId: r.distributorUserId,
        distributorName: distributor?.nickname ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    });
    return { list, total, page, pageSize };
  }
}
