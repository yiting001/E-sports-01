import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../domain/category-repository.interface';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../domain/product-repository.interface';

/** 用例：删除分类，存在商品占用时拒绝，避免商品失去归属 */
@Injectable()
export class RemoveCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repo: CategoryRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('分类不存在');
    }
    const count = await this.products.countByCategory(id);
    if (count > 0) {
      throw new BadRequestException('该分类下存在商品，无法删除');
    }
    await this.repo.remove(entity);
  }
}
