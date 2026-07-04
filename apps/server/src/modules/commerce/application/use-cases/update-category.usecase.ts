import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryView, UpdateCategoryPayload } from '@app/contracts';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../domain/category-repository.interface';
import { toCategoryView } from '../category.mapper';

/** 用例：更新分类（按需部分更新），改名时校验同租户重名 */
@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repo: CategoryRepository,
  ) {}

  async execute(id: string, payload: UpdateCategoryPayload): Promise<CategoryView> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('分类不存在');
    }
    if (
      payload.name !== undefined &&
      payload.name !== entity.name &&
      (await this.repo.existsByName(payload.name, id))
    ) {
      throw new ConflictException('分类名已存在');
    }
    if (payload.name !== undefined) {
      entity.name = payload.name;
    }
    if (payload.cover !== undefined) {
      entity.cover = payload.cover;
    }
    if (payload.icon !== undefined) {
      entity.icon = payload.icon;
    }
    if (payload.sort !== undefined) {
      entity.sort = payload.sort;
    }
    if (payload.enabled !== undefined) {
      entity.enabled = payload.enabled;
    }
    const saved = await this.repo.save(entity);
    const counts = await this.repo.countProducts([saved.id]);
    return toCategoryView(saved, counts.get(saved.id) ?? 0);
  }
}
