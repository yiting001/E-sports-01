import { BOOSTER_SERVICE_REGION, type BoosterServiceRegion } from '@/types/booster';
import type { ProductPublicView } from '@/types/commerce';

/** 商品两端价格字段（现价/原价，单位分） */
export interface ProductPlatformPrices {
  priceFen: number;
  originPriceFen: number;
  pcPriceFen: number;
  pcOriginPriceFen: number;
}

/** 按区间解析出的权威价格 */
export interface ResolvedProductPrice {
  priceFen: number;
  originPriceFen: number;
}

/**
 * 商品价格口径（与 packages/contracts 同源）。
 * 未选择区服前按两端最低现价展示「起」价；选定区服后按该端价格结算。
 */
export function lowestProductPriceFen(product: Pick<ProductPublicView, 'priceFen' | 'pcPriceFen'>): number {
  return Math.min(product.priceFen, product.pcPriceFen);
}

/** 按区服解析商品价格（电脑端取 pc 字段，其余取手机端字段） */
export function resolveProductPrice(
  product: ProductPlatformPrices,
  serviceRegion: BoosterServiceRegion,
): ResolvedProductPrice {
  if (serviceRegion === BOOSTER_SERVICE_REGION.Pc) {
    return { priceFen: product.pcPriceFen, originPriceFen: product.pcOriginPriceFen };
  }
  return { priceFen: product.priceFen, originPriceFen: product.originPriceFen };
}
