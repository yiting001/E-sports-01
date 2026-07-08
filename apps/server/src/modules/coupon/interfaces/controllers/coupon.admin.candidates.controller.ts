import { Controller, Get, Query } from '@nestjs/common';
import {
  CouponDistributorCandidate,
  PaginatedResult,
  PERMS,
} from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { ListDistributorCandidatesUseCase } from '../../application/use-cases/list-distributor-candidates.usecase';

/**
 * 路由：可指派为分发人的候选用户（GET /coupon/admin/distributor-candidates）。
 * 供管理端分发人选择器使用，需 coupon:save 权限。
 * 注意：静态段路由，须注册在 admin/:id 参数路由之前。
 */
@Controller('coupon')
export class CouponAdminCandidatesController {
  constructor(private readonly useCase: ListDistributorCandidatesUseCase) {}

  @Get('admin/distributor-candidates')
  @Permissions(PERMS.coupon.save)
  list(
    @Query() query: PaginationQueryDto,
    @Query('keyword') keyword?: string,
  ): Promise<PaginatedResult<CouponDistributorCandidate>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, keyword);
  }
}
