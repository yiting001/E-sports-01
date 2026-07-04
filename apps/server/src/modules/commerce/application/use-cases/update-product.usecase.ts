import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductView, UpdateProductPayload } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../domain/category-repository.interface';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../domain/product-repository.interface';
import { ProductViewAssembler } from '../product-view.assembler';

/** 用例：更新商品（按需部分更新），校验分类与关联客服存在 */
@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repo: ProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    private readonly users: UserDirectory,
    private readonly assembler: ProductViewAssembler,
  ) {}

  async execute(id: string, payload: UpdateProductPayload): Promise<ProductView> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('商品不存在');
    }
    if (payload.categoryId !== undefined) {
      const category = await this.categories.findById(payload.categoryId);
      if (!category) {
        throw new NotFoundException('分类不存在');
      }
      entity.categoryId = payload.categoryId;
    }
    if (payload.serviceAgentId !== undefined) {
      await this.assertAgentExists(payload.serviceAgentId);
      entity.serviceAgentId = payload.serviceAgentId;
    }
    if (payload.title !== undefined) {
      entity.title = payload.title;
    }
    if (payload.coverTitle !== undefined) {
      entity.coverTitle = payload.coverTitle;
    }
    if (payload.coverSub !== undefined) {
      entity.coverSub = payload.coverSub;
    }
    if (payload.description !== undefined) {
      entity.description = payload.description;
    }
    if (payload.priceFen !== undefined) {
      entity.priceFen = payload.priceFen;
    }
    if (payload.originPriceFen !== undefined) {
      entity.originPriceFen = payload.originPriceFen;
    }
    if (payload.sort !== undefined) {
      entity.sort = payload.sort;
    }
    const saved = await this.repo.save(entity);
    return this.assembler.assemble(saved);
  }

  private async assertAgentExists(agentId: string): Promise<void> {
    if (!agentId) {
      return;
    }
    const briefs = await this.users.findBriefs([agentId]);
    if (briefs.length === 0) {
      throw new BadRequestException('关联客服不存在');
    }
  }
}
