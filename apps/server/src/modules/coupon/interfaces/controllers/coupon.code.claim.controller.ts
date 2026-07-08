import { Controller, Param, Post } from '@nestjs/common';
import { UserCouponView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ClaimCouponByCodeUseCase } from '../../application/use-cases/claim-coupon-by-code.usecase';

/** 路由：按分发码领取优惠券（POST /coupon/code/:code/claim）；归因到分发人 */
@Controller('coupon')
export class CouponCodeClaimController {
  constructor(private readonly useCase: ClaimCouponByCodeUseCase) {}

  @Post('code/:code/claim')
  claim(
    @CurrentUser() user: AuthUser,
    @Param('code') code: string,
  ): Promise<UserCouponView> {
    return this.useCase.execute(user.id, code);
  }
}
