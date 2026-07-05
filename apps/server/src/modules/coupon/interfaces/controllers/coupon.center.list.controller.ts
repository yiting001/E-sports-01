import { Controller, Get } from '@nestjs/common';
import { CouponPublicView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ListClaimableCouponsUseCase } from '../../application/use-cases/list-claimable-coupons.usecase';

/** 路由：领券中心列表（GET /coupon/center）；仅登录态，所有角色可用 */
@Controller('coupon')
export class CouponCenterListController {
  constructor(private readonly useCase: ListClaimableCouponsUseCase) {}

  @Get('center')
  list(@CurrentUser() user: AuthUser): Promise<CouponPublicView[]> {
    return this.useCase.execute(user.id);
  }
}
