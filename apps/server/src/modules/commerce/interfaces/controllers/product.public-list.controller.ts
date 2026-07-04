import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, ProductPublicView } from '@app/contracts';
import { ListPublicProductsUseCase } from '../../application/use-cases/list-public-products.usecase';
import { Public } from '../../../rbac/interfaces/auth/public.decorator';
import { PublicProductQueryDto } from '../dto/public-product-query.dto';

/** 路由：C 端分页查询上架商品（GET /commerce/public/products），免登录只读 */
@Controller('commerce/public/products')
export class ProductPublicListController {
  constructor(private readonly useCase: ListPublicProductsUseCase) {}

  @Get()
  @Public()
  list(
    @Query() query: PublicProductQueryDto,
  ): Promise<PaginatedResult<ProductPublicView>> {
    return this.useCase.execute(
      query.page,
      query.pageSize,
      query.skip,
      query.categoryId,
      query.keyword,
    );
  }
}
