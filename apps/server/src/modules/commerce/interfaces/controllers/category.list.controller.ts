import { Controller, Get, Query } from '@nestjs/common';
import { CategoryView, PaginatedResult, PERMS } from '@app/contracts';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.usecase';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/** 路由：分页查询分类列表（GET /commerce/categories），需 commerce:category:list 权限 */
@Controller('commerce/categories')
export class CategoryListController {
  constructor(private readonly useCase: ListCategoriesUseCase) {}

  @Get()
  @Permissions(PERMS.category.list)
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResult<CategoryView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip);
  }
}
