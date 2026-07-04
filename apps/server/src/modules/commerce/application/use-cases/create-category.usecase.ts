import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CategoryView, CreateCategoryPayload } from '@app/contracts';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../domain/category-repository.interface';
import { toCategoryView } from '../category.mapper';

/** 用例：创建分类，同租户下分类名不可重复 */
@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repo: CategoryRepository,
  ) {}

  async execute(payload: CreateCategoryPayload): Promise<CategoryView> {
    if (await this.repo.existsByName(payload.name)) {
      throw new ConflictException('分类名已存在');
    }
    const entity = this.repo.create({
      name: payload.name,
      cover: payload.cover ?? '',
      icon: payload.icon ?? '',
      sort: payload.sort ?? 0,
      enabled: payload.enabled ?? true,
    });
    const saved = await this.repo.save(entity);
    return toCategoryView(saved, 0);
  }
}
