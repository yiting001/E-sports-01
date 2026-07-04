import { Body, Controller, Post } from '@nestjs/common';
import { CategoryView, PERMS } from '@app/contracts';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CreateCategoryDto } from '../dto/create-category.dto';

/** 路由：创建分类（POST /commerce/categories），需 commerce:category:create 权限 */
@Controller('commerce/categories')
export class CategoryCreateController {
  constructor(private readonly useCase: CreateCategoryUseCase) {}

  @Post()
  @Permissions(PERMS.category.create)
  create(@Body() dto: CreateCategoryDto): Promise<CategoryView> {
    return this.useCase.execute(dto);
  }
}
