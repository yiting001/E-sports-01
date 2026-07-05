import { Controller, Get, Query } from '@nestjs/common';
import { AdminReviewView, PaginatedResult, PERMS } from '@app/contracts';
import { ListAdminReviewsUseCase } from '../../application/use-cases/list-admin-reviews.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { ReviewAdminListQueryDto } from '../dto/review-admin-list-query.dto';

/**
 * 路由：管理端分页检索评论（GET /review），可按星级/可见状态过滤。
 * 需 review:admin:list 权限。
 */
@Controller('review')
export class ReviewAdminListController {
  constructor(private readonly useCase: ListAdminReviewsUseCase) {}

  @Get()
  @Permissions(PERMS.review.list)
  list(
    @Query() query: ReviewAdminListQueryDto,
  ): Promise<PaginatedResult<AdminReviewView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, {
      rating: query.rating,
      visible: query.visible,
    });
  }
}
