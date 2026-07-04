import { Inject, Injectable } from '@nestjs/common';
import { CategoryView, PaginatedResult } from '@app/contracts';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../domain/category-repository.interface';
import { toCategoryView } from '../category.mapper';

/** 用例：分页查询分类（管理端），附带各分类下的商品数 */
@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repo: CategoryRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<CategoryView>> {
    const [rows, total] = await this.repo.paginate(skip, pageSize);
    const counts = await this.repo.countProducts(rows.map((r) => r.id));
    const list = rows.map((r) => toCategoryView(r, counts.get(r.id) ?? 0));
    return { list, total, page, pageSize };
  }
}
