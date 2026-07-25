import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus, ProductView } from '@app/contracts';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../domain/product-repository.interface';
import {
  hasValidProductSalePrices,
  PRODUCT_SALE_PRICE_REQUIRED_MESSAGE,
} from '../../domain/product-pricing.rules';
import { ProductViewAssembler } from '../product-view.assembler';

/** 用例：商品上下架（切换 status） */
@Injectable()
export class PublishProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repo: ProductRepository,
    private readonly assembler: ProductViewAssembler,
  ) {}

  async execute(id: string, status: ProductStatus): Promise<ProductView> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('商品不存在');
    }
    if (status === ProductStatus.OnShelf && !hasValidProductSalePrices(entity)) {
      throw new BadRequestException(PRODUCT_SALE_PRICE_REQUIRED_MESSAGE);
    }
    entity.status = status;
    const saved = await this.repo.save(entity);
    return this.assembler.assemble(saved);
  }
}
