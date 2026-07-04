import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProductPublicView, ProductStatus } from '@app/contracts';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../domain/category-repository.interface';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../domain/product-repository.interface';
import { toProductPublicView } from '../product.mapper';

/** 用例：C 端查看单个上架商品详情（只读），下架/不存在均视为不可见 */
@Injectable()
export class GetPublicProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repo: ProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  async execute(id: string): Promise<ProductPublicView> {
    const entity = await this.repo.findById(id);
    if (!entity || entity.status !== ProductStatus.OnShelf) {
      throw new NotFoundException('商品不存在或已下架');
    }
    const [category] = await this.categories.findByIds([entity.categoryId]);
    return toProductPublicView(entity, category?.name ?? '');
  }
}
