import { describe, expect, it } from "vitest";
import { productCardSummary } from "./product-card.utils";

describe("商品卡片摘要", () => {
  it("移除富文本标签并合并空白", () => {
    expect(productCardSummary("<p>快速&nbsp;上分</p><br><strong>稳定</strong>")).toBe(
      "快速&nbsp;上分 稳定"
    );
  });

  it("空描述返回空字符串，交给固定摘要槽位占位", () => {
    expect(productCardSummary("   ")).toBe("");
    expect(productCardSummary("<p></p>")).toBe("");
  });
});
