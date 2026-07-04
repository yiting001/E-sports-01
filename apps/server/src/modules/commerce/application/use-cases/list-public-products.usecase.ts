import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, ProductPublicView, ProductStatus } from '@app/contracts';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../domain/category-repository.interface';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../domain/product-repository.interface';
import { toProductPublicView } from '../product.mapper';

/** 用例：C 端分页查询上架商品（只读），可按分类/关键字过滤 */
@Injectable()
export class ListPublicProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repo: ProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    categoryId?: string,
    keyword?: string,
  ): Promise<PaginatedResult<ProductPublicView>> {
    const [rows, total] = await this.repo.paginate(skip, pageSize, {
      status: ProductStatus.OnShelf,
      categoryId,
      keyword,
    });
    const categories = await this.categories.findByIds(
      rows.map((r) => r.categoryId),
    );
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    const list = rows.map((r) =>
      toProductPublicView(r, categoryName.get(r.categoryId) ?? ''),
    );
    return { list, total, page, pageSize };
  }
}
