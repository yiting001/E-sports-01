import { ProductPublicView, ProductView } from '@app/contracts';
import { ProductEntity } from '../domain/product.entity';

/** 领域实体 → 管理端商品视图（分类名/客服名由用例注入，免二次查询） */
export function toProductView(
  entity: ProductEntity,
  categoryName = '',
  serviceAgentName = '',
): ProductView {
  return {
    id: entity.id,
    categoryId: entity.categoryId,
    categoryName,
    title: entity.title,
    coverTitle: entity.coverTitle,
    coverSub: entity.coverSub,
    description: entity.description,
    priceFen: entity.priceFen,
    originPriceFen: entity.originPriceFen,
    sold: entity.sold,
    serviceAgentId: entity.serviceAgentId,
    serviceAgentName,
    status: entity.status,
    sort: entity.sort,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/** 领域实体 → C 端只读商品视图 */
export function toProductPublicView(
  entity: ProductEntity,
  categoryName = '',
): ProductPublicView {
  return {
    id: entity.id,
    categoryId: entity.categoryId,
    categoryName,
    title: entity.title,
    coverTitle: entity.coverTitle,
    coverSub: entity.coverSub,
    description: entity.description,
    priceFen: entity.priceFen,
    originPriceFen: entity.originPriceFen,
    sold: entity.sold,
  };
}
