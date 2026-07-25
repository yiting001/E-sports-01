import { ProductStatus } from "@app/contracts";
import { describe, expect, it } from "vitest";
import { hasValidProductFormPrices } from "./product-price";

describe("管理端商品价格校验", () => {
  it("下架草稿允许暂存零价格", () => {
    expect(hasValidProductFormPrices(ProductStatus.OffShelf, 0, 0)).toBe(true);
  });

  it("上架商品要求手机端和电脑端现价都大于零", () => {
    expect(hasValidProductFormPrices(ProductStatus.OnShelf, 1, 1)).toBe(true);
    expect(hasValidProductFormPrices(ProductStatus.OnShelf, 0, 1)).toBe(false);
    expect(hasValidProductFormPrices(ProductStatus.OnShelf, 1, 0)).toBe(false);
  });
});
