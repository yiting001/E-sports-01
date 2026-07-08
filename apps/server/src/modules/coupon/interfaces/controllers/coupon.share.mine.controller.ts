import { Controller, Get } from '@nestjs/common';
import { CouponShareView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ListMyDistributionsUseCase } from '../../application/use-cases/list-my-distributions.usecase';

/** 路由：我的推广券列表（GET /coupon/share/mine）；仅登录态，分发人查看 */
@Controller('coupon')
export class CouponShareMineController {
  constructor(private readonly useCase: ListMyDistributionsUseCase) {}

  @Get('share/mine')
  mine(@CurrentUser() user: AuthUser): Promise<CouponShareView[]> {
    return this.useCase.execute(user.id);
  }
}
