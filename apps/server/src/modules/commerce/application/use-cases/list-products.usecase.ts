import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, ProductView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../domain/category-repository.interface';
import {
  PRODUCT_REPOSITORY,
  ProductFilter,
  ProductRepository,
} from '../../domain/product-repository.interface';
import { toProductView } from '../product.mapper';

/** 用例：分页查询商品（管理端），解析分类名与关联客服展示名 */
@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repo: ProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    filter: ProductFilter,
  ): Promise<PaginatedResult<ProductView>> {
    const [rows, total] = await this.repo.paginate(skip, pageSize, filter);
    const categories = await this.categories.findByIds(
      rows.map((r) => r.categoryId),
    );
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    const agents = await this.users.resolveProfiles(
      rows.map((r) => r.serviceAgentId),
    );
    const list = rows.map((r) =>
      toProductView(
        r,
        categoryName.get(r.categoryId) ?? '',
        agents.get(r.serviceAgentId)?.nickname ||
          agents.get(r.serviceAgentId)?.username ||
          '',
      ),
    );
    return { list, total, page, pageSize };
  }
}
