import { CategoryPublicView, CategoryView } from '@app/contracts';
import { CategoryEntity } from '../domain/category.entity';

/** 领域实体 → 管理端分类视图 */
export function toCategoryView(
  entity: CategoryEntity,
  productCount = 0,
): CategoryView {
  return {
    id: entity.id,
    name: entity.name,
    cover: entity.cover,
    icon: entity.icon,
    sort: entity.sort,
    enabled: entity.enabled,
    productCount,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/** 领域实体 → C 端只读分类视图 */
export function toCategoryPublicView(entity: CategoryEntity): CategoryPublicView {
  return {
    id: entity.id,
    name: entity.name,
    cover: entity.cover,
    icon: entity.icon,
  };
}
