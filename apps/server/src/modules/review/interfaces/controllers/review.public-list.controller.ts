import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductReviewPage } from '@app/contracts';
import { ListProductReviewsUseCase } from '../../application/use-cases/list-product-reviews.usecase';
import { TenantPublic } from '../../../rbac/interfaces/auth/tenant-public.decorator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/**
 * 路由：商品可见评论分页（GET /review/public/product/:productId）。
 * 免登录只读，商品详情页展示评论列表与平均分。
 */
@Controller('review/public/product')
export class ReviewPublicListController {
  constructor(private readonly useCase: ListProductReviewsUseCase) {}

  @Get(':productId')
  @TenantPublic()
  list(
    @Param('productId') productId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<ProductReviewPage> {
    return this.useCase.execute(productId, query.page, query.pageSize, query.skip);
  }
}
