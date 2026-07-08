import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { COUPON_LIMITS, CouponDistributorView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  COUPON_REPOSITORY,
  CouponRepository,
} from '../../domain/coupon-repository.interface';

/** 分发码字符集：大写字母+数字，去除易混淆的 0/O/1/I */
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 生成一枚随机分发码 */
function randomCode(): string {
  return Array.from(
    { length: COUPON_LIMITS.shareCodeLength },
    () => CODE_CHARSET[randomInt(CODE_CHARSET.length)],
  ).join('');
}

/**
 * 用例：为优惠券添加分发人（管理端）。
 * 校验券与用户存在、不重复指派，生成唯一分发码；
 * 码撞库（唯一约束冲突）时换码重试。
 */
@Injectable()
export class AddCouponDistributorUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly repo: CouponRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    couponId: string,
    userId: string,
  ): Promise<CouponDistributorView> {
    const coupon = await this.repo.findById(couponId);
    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }
    const profiles = await this.users.resolveProfiles([userId]);
    const profile = profiles.get(userId);
    if (!profile) {
      throw new NotFoundException('用户不存在');
    }
    const existing = await this.repo.findDistributors(couponId);
    if (existing.some((d) => d.userId === userId)) {
      throw new BadRequestException('该用户已是此券的分发人');
    }
    for (;;) {
      try {
        const saved = await this.repo.saveDistributor(
          this.repo.createDistributor({
            couponId,
            userId,
            code: randomCode(),
          }),
        );
        return {
          id: saved.id,
          userId: saved.userId,
          username: profile.username,
          nickname: profile.nickname,
          code: saved.code,
          claimedCount: 0,
          createdAt: saved.createdAt.toISOString(),
        };
      } catch {
        // 唯一约束冲突：并发重复指派则报错返回，码撞库则换码重试
        const concurrent = await this.repo.findDistributors(couponId);
        if (concurrent.some((d) => d.userId === userId)) {
          throw new BadRequestException('该用户已是此券的分发人');
        }
      }
    }
  }
}
