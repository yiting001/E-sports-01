import { Body, Controller, Param, Patch } from '@nestjs/common';
import { PERMS, ProductView } from '@app/contracts';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpdateProductDto } from '../dto/update-product.dto';

/** 路由：更新商品（PATCH /commerce/products/:id），需 commerce:product:update 权限 */
@Controller('commerce/products')
export class ProductUpdateController {
  constructor(private readonly useCase: UpdateProductUseCase) {}

  @Patch(':id')
  @Permissions(PERMS.product.update)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductView> {
    return this.useCase.execute(id, dto);
  }
}
