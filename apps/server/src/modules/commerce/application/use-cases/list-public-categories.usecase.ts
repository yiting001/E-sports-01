import { Inject, Injectable } from '@nestjs/common';
import { CategoryPublicView } from '@app/contracts';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../domain/category-repository.interface';
import { toCategoryPublicView } from '../category.mapper';

/** 用例：C 端查询启用中的分类（只读） */
@Injectable()
export class ListPublicCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repo: CategoryRepository,
  ) {}

  async execute(): Promise<CategoryPublicView[]> {
    const rows = await this.repo.listEnabled();
    return rows.map(toCategoryPublicView);
  }
}
