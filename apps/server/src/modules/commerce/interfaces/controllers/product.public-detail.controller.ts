import { Controller, Get, Param } from '@nestjs/common';
import { ProductPublicView } from '@app/contracts';
import { GetPublicProductUseCase } from '../../application/use-cases/get-public-product.usecase';
import { Public } from '../../../rbac/interfaces/auth/public.decorator';

/** 路由：C 端商品详情（GET /commerce/public/products/:id），免登录只读，仅上架商品可见 */
@Controller('commerce/public/products')
export class ProductPublicDetailController {
  constructor(private readonly useCase: GetPublicProductUseCase) {}

  @Get(':id')
  @Public()
  detail(@Param('id') id: string): Promise<ProductPublicView> {
    return this.useCase.execute(id);
  }
}
