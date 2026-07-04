import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductPayload, ProductStatus, ProductView } from '@app/contracts';
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

/** 用例：创建商品，校验分类存在、关联客服存在；新建默认下架，需显式上架 */
@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repo: ProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    private readonly users: UserDirectory,
    private readonly assembler: ProductViewAssembler,
  ) {}

  async execute(payload: CreateProductPayload): Promise<ProductView> {
    const category = await this.categories.findById(payload.categoryId);
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    await this.assertAgentExists(payload.serviceAgentId);
    const entity = this.repo.create({
      categoryId: payload.categoryId,
      title: payload.title,
      cover: payload.cover ?? '',
      coverTitle: payload.coverTitle,
      coverSub: payload.coverSub ?? '',
      description: payload.description ?? '',
      priceFen: payload.priceFen,
      originPriceFen: payload.originPriceFen,
      serviceAgentId: payload.serviceAgentId ?? '',
      status: ProductStatus.OffShelf,
      sort: payload.sort ?? 0,
    });
    const saved = await this.repo.save(entity);
    return this.assembler.assemble(saved);
  }

  private async assertAgentExists(agentId?: string): Promise<void> {
    if (!agentId) {
      return;
    }
    const briefs = await this.users.findBriefs([agentId]);
    if (briefs.length === 0) {
      throw new BadRequestException('关联客服不存在');
    }
  }
}
