import { Body, Controller, Post } from '@nestjs/common';
import { PERMS, ProductView } from '@app/contracts';
import { CreateProductUseCase } from '../../application/use-cases/create-product.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CreateProductDto } from '../dto/create-product.dto';

/** 路由：创建商品（POST /commerce/products），需 commerce:product:create 权限 */
@Controller('commerce/products')
export class ProductCreateController {
  constructor(private readonly useCase: CreateProductUseCase) {}

  @Post()
  @Permissions(PERMS.product.create)
  create(@Body() dto: CreateProductDto): Promise<ProductView> {
    return this.useCase.execute(dto);
  }
}
