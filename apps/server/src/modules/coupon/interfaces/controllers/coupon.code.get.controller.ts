import { Controller, Get, Param } from '@nestjs/common';
import { CouponCodeView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { GetCouponByCodeUseCase } from '../../application/use-cases/get-coupon-by-code.usecase';

/** 路由：按分发码查看券信息（GET /coupon/code/:code）；分发链接落地页 */
@Controller('coupon')
export class CouponCodeGetController {
  constructor(private readonly useCase: GetCouponByCodeUseCase) {}

  @Get('code/:code')
  get(
    @CurrentUser() user: AuthUser,
    @Param('code') code: string,
  ): Promise<CouponCodeView> {
    return this.useCase.execute(user.id, code);
  }
}
