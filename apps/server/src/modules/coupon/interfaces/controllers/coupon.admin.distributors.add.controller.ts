import { Body, Controller, Param, Post } from '@nestjs/common';
import { CouponDistributorView, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { AddCouponDistributorUseCase } from '../../application/use-cases/add-coupon-distributor.usecase';
import { AddCouponDistributorDto } from '../dto/add-coupon-distributor.dto';

/**
 * 路由：为某券添加分发人（POST /coupon/admin/:id/distributors）。
 * 需 coupon:save 权限。
 */
@Controller('coupon')
export class CouponAdminDistributorsAddController {
  constructor(private readonly useCase: AddCouponDistributorUseCase) {}

  @Post('admin/:id/distributors')
  @Permissions(PERMS.coupon.save)
  add(
    @Param('id') id: string,
    @Body() dto: AddCouponDistributorDto,
  ): Promise<CouponDistributorView> {
    return this.useCase.execute(id, dto.userId);
  }
}
