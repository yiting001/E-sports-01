import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../domain/product-repository.interface';

/** 用例：删除商品 */
@Injectable()
export class RemoveProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repo: ProductRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('商品不存在');
    }
    await this.repo.remove(entity);
  }
}
