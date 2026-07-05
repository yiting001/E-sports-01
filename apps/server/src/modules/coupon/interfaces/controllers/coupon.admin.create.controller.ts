import { Body, Controller, Post } from '@nestjs/common';
import { CouponView, PERMS } from '@app/contracts';
import { SaveCouponUseCase } from '../../application/use-cases/save-coupon.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpsertCouponDto } from '../dto/upsert-coupon.dto';

/**
 * 路由：新建优惠券（POST /coupon/admin）。
 * 需 coupon:save 权限。
 */
@Controller('coupon')
export class CouponAdminCreateController {
  constructor(private readonly useCase: SaveCouponUseCase) {}

  @Post('admin')
  @Permissions(PERMS.coupon.save)
  create(@Body() dto: UpsertCouponDto): Promise<CouponView> {
    return this.useCase.execute(dto);
  }
}
