import { ProductStatus } from '@app/contracts';
import { ProductEntity } from './product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

/** 商品分页过滤条件 */
export interface ProductFilter {
  categoryId?: string;
  status?: ProductStatus;
  keyword?: string;
}

/** 商品仓储接口（领域层只依赖抽象，实现在基础设施层，读操作按租户上下文过滤） */
export interface ProductRepository {
  /** 按主键取商品 */
  findById(id: string): Promise<ProductEntity | null>;
  /** 分页查询商品，按 sort 升序、创建时间倒序 */
  paginate(
    skip: number,
    take: number,
    filter: ProductFilter,
  ): Promise<[ProductEntity[], number]>;
  /** 统计某分类下的商品数（用于删除分类前的占用校验） */
  countByCategory(categoryId: string): Promise<number>;
  create(data: Partial<ProductEntity>): ProductEntity;
  save(entity: ProductEntity): Promise<ProductEntity>;
  remove(entity: ProductEntity): Promise<void>;
}
