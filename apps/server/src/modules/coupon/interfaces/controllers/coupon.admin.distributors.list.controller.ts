import { Controller, Get, Param } from '@nestjs/common';
import { CouponDistributorView, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { ListCouponDistributorsUseCase } from '../../application/use-cases/list-coupon-distributors.usecase';

/**
 * 路由：某券的分发人列表（GET /coupon/admin/:id/distributors）。
 * 需 coupon:list 权限。
 */
@Controller('coupon')
export class CouponAdminDistributorsListController {
  constructor(private readonly useCase: ListCouponDistributorsUseCase) {}

  @Get('admin/:id/distributors')
  @Permissions(PERMS.coupon.list)
  list(@Param('id') id: string): Promise<CouponDistributorView[]> {
    return this.useCase.execute(id);
  }
}
