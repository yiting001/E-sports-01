import type { ProductStatus } from "@app/contracts";

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
  /** 手机端现价/原价（元，仅用于管理表单展示） */
  priceYuan: number;
  originPriceYuan: number;
  /** 电脑端现价/原价（元，仅用于管理表单展示） */
  pcPriceYuan: number;
  pcOriginPriceYuan: number;
  serviceAgentId: string;
  sort: number;
}
