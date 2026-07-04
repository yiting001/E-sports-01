import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, PERMS, ProductView } from '@app/contracts';
import { ListProductsUseCase } from '../../application/use-cases/list-products.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { ProductListQueryDto } from '../dto/product-list-query.dto';

/** 路由：分页查询商品列表（GET /commerce/products），需 commerce:product:list 权限 */
@Controller('commerce/products')
export class ProductListController {
  constructor(private readonly useCase: ListProductsUseCase) {}

  @Get()
  @Permissions(PERMS.product.list)
  list(@Query() query: ProductListQueryDto): Promise<PaginatedResult<ProductView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, {
      categoryId: query.categoryId,
      status: query.status,
      keyword: query.keyword,
    });
  }
}
