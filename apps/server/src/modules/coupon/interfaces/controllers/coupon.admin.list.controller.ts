import { Controller, Get, Query } from '@nestjs/common';
import { CouponView, PaginatedResult, PERMS } from '@app/contracts';
import { ListCouponsUseCase } from '../../application/use-cases/list-coupons.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/**
 * 路由：管理端分页查询优惠券列表（GET /coupon/admin）。
 * 需 coupon:list 权限。
 */
@Controller('coupon')
export class CouponAdminListController {
  constructor(private readonly useCase: ListCouponsUseCase) {}

  @Get('admin')
  @Permissions(PERMS.coupon.list)
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResult<CouponView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip);
  }
}
