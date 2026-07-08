import { Controller, Get, Param, Query } from '@nestjs/common';
import { CouponClaimRecordView, PaginatedResult, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { ListCouponClaimsUseCase } from '../../application/use-cases/list-coupon-claims.usecase';

/**
 * 路由：某券的领取记录分页（GET /coupon/admin/:id/claims）。
 * 记录哪个用户领了、经哪个分发人；需 coupon:list 权限。
 */
@Controller('coupon')
export class CouponAdminClaimsController {
  constructor(private readonly useCase: ListCouponClaimsUseCase) {}

  @Get('admin/:id/claims')
  @Permissions(PERMS.coupon.list)
  list(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<CouponClaimRecordView>> {
    return this.useCase.execute(id, query.page, query.pageSize, query.skip);
  }
}
