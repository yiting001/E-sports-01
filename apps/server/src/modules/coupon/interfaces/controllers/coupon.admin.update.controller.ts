import { Body, Controller, Param, Put } from '@nestjs/common';
import { CouponView, PERMS } from '@app/contracts';
import { SaveCouponUseCase } from '../../application/use-cases/save-coupon.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpsertCouponDto } from '../dto/upsert-coupon.dto';

/**
 * 路由：编辑优惠券（PUT /coupon/admin/:id）。
 * 需 coupon:save 权限。
 */
@Controller('coupon')
export class CouponAdminUpdateController {
  constructor(private readonly useCase: SaveCouponUseCase) {}

  @Put('admin/:id')
  @Permissions(PERMS.coupon.save)
  update(
    @Param('id') id: string,
    @Body() dto: UpsertCouponDto,
  ): Promise<CouponView> {
    return this.useCase.execute(dto, id);
  }
}
