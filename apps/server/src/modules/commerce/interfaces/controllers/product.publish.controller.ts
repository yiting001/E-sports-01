import { Body, Controller, Param, Patch } from '@nestjs/common';
import { PERMS, ProductView } from '@app/contracts';
import { PublishProductUseCase } from '../../application/use-cases/publish-product.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { PublishProductDto } from '../dto/publish-product.dto';

/** 路由：商品上下架（PATCH /commerce/products/:id/status），需 commerce:product:publish 权限 */
@Controller('commerce/products')
export class ProductPublishController {
  constructor(private readonly useCase: PublishProductUseCase) {}

  @Patch(':id/status')
  @Permissions(PERMS.product.publish)
  publish(
    @Param('id') id: string,
    @Body() dto: PublishProductDto,
  ): Promise<ProductView> {
    return this.useCase.execute(id, dto.status);
  }
}
