import { Controller, Param, Post } from '@nestjs/common';
import { UserCouponView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ClaimCouponUseCase } from '../../application/use-cases/claim-coupon.usecase';

/** 路由：领取优惠券（POST /coupon/:id/claim）；仅登录态，所有角色可用 */
@Controller('coupon')
export class CouponClaimController {
  constructor(private readonly useCase: ClaimCouponUseCase) {}

  @Post(':id/claim')
  claim(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<UserCouponView> {
    return this.useCase.execute(user.id, id);
  }
}
