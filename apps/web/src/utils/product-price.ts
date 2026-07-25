import { ProductStatus } from "@app/contracts";

/** 下架草稿可暂存零价格；上架商品必须保证两个服务端均可销售。 */
export function hasValidProductFormPrices(
  status: ProductStatus,
  mobilePriceYuan: number,
  pcPriceYuan: number
): boolean {
  return (
    status === ProductStatus.OffShelf ||
    (mobilePriceYuan > 0 && pcPriceYuan > 0)
  );
}
