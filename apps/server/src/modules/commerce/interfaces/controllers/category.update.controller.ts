import { Body, Controller, Param, Patch } from '@nestjs/common';
import { CategoryView, PERMS } from '@app/contracts';
import { UpdateCategoryUseCase } from '../../application/use-cases/update-category.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpdateCategoryDto } from '../dto/update-category.dto';

/** 路由：更新分类（PATCH /commerce/categories/:id），需 commerce:category:update 权限 */
@Controller('commerce/categories')
export class CategoryUpdateController {
  constructor(private readonly useCase: UpdateCategoryUseCase) {}

  @Patch(':id')
  @Permissions(PERMS.category.update)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryView> {
    return this.useCase.execute(id, dto);
  }
}
