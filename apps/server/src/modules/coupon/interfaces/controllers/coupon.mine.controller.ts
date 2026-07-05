import { Controller, Get } from '@nestjs/common';
import { UserCouponView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ListMyCouponsUseCase } from '../../application/use-cases/list-my-coupons.usecase';

/** 路由：我的优惠券列表（GET /coupon/mine）；仅登录态，所有角色可用 */
@Controller('coupon')
export class CouponMineController {
  constructor(private readonly useCase: ListMyCouponsUseCase) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser): Promise<UserCouponView[]> {
    return this.useCase.execute(user.id);
  }
}
