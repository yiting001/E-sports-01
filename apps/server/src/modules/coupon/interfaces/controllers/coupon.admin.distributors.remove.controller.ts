import { Controller, Delete, Param } from '@nestjs/common';
import { PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { RemoveCouponDistributorUseCase } from '../../application/use-cases/remove-coupon-distributor.usecase';

/**
 * 路由：移除某券的分发人（DELETE /coupon/admin/:id/distributors/:distributorId）。
 * 需 coupon:save 权限；已领出的用户券不受影响。
 */
@Controller('coupon')
export class CouponAdminDistributorsRemoveController {
  constructor(private readonly useCase: RemoveCouponDistributorUseCase) {}

  @Delete('admin/:id/distributors/:distributorId')
  @Permissions(PERMS.coupon.save)
  remove(
    @Param('id') id: string,
    @Param('distributorId') distributorId: string,
  ): Promise<void> {
    return this.useCase.execute(id, distributorId);
  }
}
