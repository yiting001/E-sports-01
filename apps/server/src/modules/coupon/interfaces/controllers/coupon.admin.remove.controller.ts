import { Controller, Delete, Param } from '@nestjs/common';
import { PERMS } from '@app/contracts';
import { RemoveCouponUseCase } from '../../application/use-cases/remove-coupon.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/**
 * 路由：删除优惠券（DELETE /coupon/admin/:id）。
 * 需 coupon:remove 权限。
 */
@Controller('coupon')
export class CouponAdminRemoveController {
  constructor(private readonly useCase: RemoveCouponUseCase) {}

  @Delete('admin/:id')
  @Permissions(PERMS.coupon.remove)
  remove(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
