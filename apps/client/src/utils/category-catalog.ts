import type { CategoryPublicView, ProductPublicView } from '@app/contracts';
import type { CategoryGroup } from '@/config/category.mock';

/** 将公开分类和商品组装为分类目录所需的稳定视图模型。 */
export function buildCategoryGroups(
  categories: CategoryPublicView[],
  products: ProductPublicView[],
): CategoryGroup[] {
  return categories.map((category) => ({
    id: category.id,
    title: category.name,
    icon: category.icon,
    iconText: category.cover,
    items: products.filter((product) => product.categoryId === category.id),
  }));
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN');
}

function productMatches(product: ProductPublicView, keyword: string): boolean {
  return [product.title, product.categoryName, product.coverTitle, product.coverSub]
    .some((value) => normalize(value).includes(keyword));
}

/** 在已加载的公开目录内进行本地搜索，保留分类顺序和空分类状态。 */
export function filterCategoryGroups(
  groups: CategoryGroup[],
  rawKeyword: string,
): CategoryGroup[] {
  const keyword = normalize(rawKeyword);
  if (!keyword) {
    return groups;
  }

  const matches: CategoryGroup[] = [];
  for (const group of groups) {
    const categoryMatches = [group.title, group.iconText].some((value) =>
      normalize(value).includes(keyword),
    );
    const items = categoryMatches
      ? group.items
      : group.items.filter((product) => productMatches(product, keyword));
    if (categoryMatches || items.length > 0) {
      matches.push({ ...group, items });
    }
  }
  return matches;
}
