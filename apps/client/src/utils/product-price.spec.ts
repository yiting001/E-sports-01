import {
  BOOSTER_SERVICE_REGION,
  resolveProductPrice,
  type ProductPublicView,
} from "@app/contracts";
import { describe, expect, it } from "vitest";

const product: ProductPublicView = {
  id: "product-1",
  categoryId: "category-1",
  categoryName: "体验单",
  title: "双端体验单",
  cover: "",
  coverTitle: "",
  coverSub: "",
  description: "",
  priceFen: 3880,
  originPriceFen: 5000,
  pcPriceFen: 8800,
  pcOriginPriceFen: 10000,
  sold: 0,
};

describe("resolveProductPrice", () => {
  it("结算页选择手机端时使用手机端价格", () => {
    expect(resolveProductPrice(product, BOOSTER_SERVICE_REGION.Mobile)).toEqual(
      {
        priceFen: 3880,
        originPriceFen: 5000,
      }
    );
  });

  it("结算页选择电脑端时使用电脑端价格", () => {
    expect(resolveProductPrice(product, BOOSTER_SERVICE_REGION.Pc)).toEqual({
      priceFen: 8800,
      originPriceFen: 10000,
    });
  });
});
