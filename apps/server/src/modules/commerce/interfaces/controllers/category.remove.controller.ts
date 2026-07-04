import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { PERMS } from '@app/contracts';
import { RemoveCategoryUseCase } from '../../application/use-cases/remove-category.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/** 路由：删除分类（DELETE /commerce/categories/:id），需 commerce:category:remove 权限 */
@Controller('commerce/categories')
export class CategoryRemoveController {
  constructor(private readonly useCase: RemoveCategoryUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(PERMS.category.remove)
  remove(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
