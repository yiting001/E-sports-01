import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { PERMS } from '@app/contracts';
import { RemoveProductUseCase } from '../../application/use-cases/remove-product.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/** 路由：删除商品（DELETE /commerce/products/:id），需 commerce:product:remove 权限 */
@Controller('commerce/products')
export class ProductRemoveController {
  constructor(private readonly useCase: RemoveProductUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(PERMS.product.remove)
  remove(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
