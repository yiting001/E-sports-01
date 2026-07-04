import type { ProductStatus } from '@app/contracts';

/** 商品分类抽屉表单模型。 */
export interface CategoryFormModel {
  name: string;
  cover: string;
  icon: string;
  sort: number;
  enabled: boolean;
}

/** 商品列表筛选模型。 */
export interface ProductFilterModel {
  categoryId?: string;
  status?: ProductStatus;
  keyword: string;
}

/** 商品抽屉表单模型。 */
export interface ProductFormModel {
  categoryId: string;
  title: string;
  cover: string;
  coverTitle: string;
  coverSub: string;
  description: string;
  priceYuan: number;
  originPriceYuan: number;
  serviceAgentId: string;
  sort: number;
}
