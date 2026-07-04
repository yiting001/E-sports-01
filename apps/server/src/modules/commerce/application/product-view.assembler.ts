import { Inject, Injectable } from '@nestjs/common';
import { ProductView } from '@app/contracts';
import { UserDirectory } from '../../rbac/application/user-directory.service';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../domain/category-repository.interface';
import { ProductEntity } from '../domain/product.entity';
import { toProductView } from './product.mapper';

/**
 * 单个商品视图组装器。
 * 收口「实体 → 视图」时对分类名、关联客服名的解析，供创建/更新/上下架等用例复用，
 * 避免各用例重复拼装。
 */
@Injectable()
export class ProductViewAssembler {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    private readonly users: UserDirectory,
  ) {}

  async assemble(entity: ProductEntity): Promise<ProductView> {
    const category = await this.categories.findById(entity.categoryId);
    let agentName = '';
    if (entity.serviceAgentId) {
      const profiles = await this.users.resolveProfiles([entity.serviceAgentId]);
      const brief = profiles.get(entity.serviceAgentId);
      agentName = brief?.nickname || brief?.username || '';
    }
    return toProductView(entity, category?.name ?? '', agentName);
  }
}
