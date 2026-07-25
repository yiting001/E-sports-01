import type { ProductPlatformPrices } from '@app/contracts';

export const PRODUCT_SALE_PRICE_REQUIRED_MESSAGE = '手机端和电脑端现价必须大于 0 才能上架';

/** 上架商品的两个服务端都必须有可销售现价。 */
export function hasValidProductSalePrices(
  product: Pick<ProductPlatformPrices, 'priceFen' | 'pcPriceFen'>,
): boolean {
  return product.priceFen > 0 && product.pcPriceFen > 0;
}
