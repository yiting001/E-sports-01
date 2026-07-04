import { Controller, Get } from '@nestjs/common';
import { CategoryPublicView } from '@app/contracts';
import { ListPublicCategoriesUseCase } from '../../application/use-cases/list-public-categories.usecase';
import { Public } from '../../../rbac/interfaces/auth/public.decorator';

/** 路由：C 端查询启用中的分类（GET /commerce/public/categories），免登录只读 */
@Controller('commerce/public/categories')
export class CategoryPublicListController {
  constructor(private readonly useCase: ListPublicCategoriesUseCase) {}

  @Get()
  @Public()
  list(): Promise<CategoryPublicView[]> {
    return this.useCase.execute();
  }
}
