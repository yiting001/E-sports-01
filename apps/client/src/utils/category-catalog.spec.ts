import type { CategoryPublicView, ProductPublicView } from "@app/contracts";
import { describe, expect, it } from "vitest";
import { buildCategoryGroups, filterCategoryGroups } from "./category-catalog";

const categories: CategoryPublicView[] = [
  { id: "category-a", name: "陪玩单", cover: "陪玩", icon: "/a.png" },
  { id: "category-b", name: "护航单", cover: "护航", icon: "" },
  { id: "category-c", name: "空分类", cover: "", icon: "" },
];

const products: ProductPublicView[] = [
  {
    id: "product-a",
    categoryId: "category-a",
    categoryName: "陪玩单",
    title: "欢乐陪玩",
    cover: "/product-a.png",
    coverTitle: "双人开黑",
    coverSub: "轻松上分",
    description: "",
    priceFen: 1000,
    originPriceFen: 1200,
    pcPriceFen: 1500,
    pcOriginPriceFen: 1800,
    sold: 10,
  },
  {
    id: "product-b",
    categoryId: "category-b",
    categoryName: "护航单",
    title: "排位护航",
    cover: "/product-b.png",
    coverTitle: "稳定护航",
    coverSub: "",
    description: "",
    priceFen: 2000,
    originPriceFen: 2000,
    pcPriceFen: 2500,
    pcOriginPriceFen: 2500,
    sold: 5,
  },
  {
    id: "orphan-product",
    categoryId: "disabled-category",
    categoryName: "停用分类",
    title: "不可见商品",
    cover: "",
    coverTitle: "",
    coverSub: "",
    description: "",
    priceFen: 100,
    originPriceFen: 100,
    pcPriceFen: 200,
    pcOriginPriceFen: 200,
    sold: 0,
  },
];

describe("buildCategoryGroups", () => {
  it("保持后台分类顺序、按分类聚合商品并保留空分类", () => {
    const groups = buildCategoryGroups(categories, products);

    expect(groups.map((group) => group.id)).toEqual([
      "category-a",
      "category-b",
      "category-c",
    ]);
    expect(groups[0]?.items.map((product) => product.id)).toEqual([
      "product-a",
    ]);
    expect(groups[1]?.items.map((product) => product.id)).toEqual([
      "product-b",
    ]);
    expect(groups[2]?.items).toEqual([]);
  });
});

describe("filterCategoryGroups", () => {
  const groups = buildCategoryGroups(categories, products);

  it("按商品标题和封面文案过滤，并保留原分类顺序", () => {
    expect(
      filterCategoryGroups(groups, "欢乐").map((group) => group.id)
    ).toEqual(["category-a"]);
    expect(
      filterCategoryGroups(groups, "稳定").map((group) => group.id)
    ).toEqual(["category-b"]);
  });

  it("分类名命中时保留该分类全部商品，空分类也可被搜索到", () => {
    expect(filterCategoryGroups(groups, "陪玩")[0]?.items).toHaveLength(1);
    expect(filterCategoryGroups(groups, "空分类")).toEqual([groups[2]]);
  });

  it("忽略首尾空白并在没有匹配项时返回空目录", () => {
    expect(
      filterCategoryGroups(groups, "  欢乐  ").map((group) => group.id)
    ).toEqual(["category-a"]);
    expect(filterCategoryGroups(groups, "不存在")).toEqual([]);
    expect(filterCategoryGroups(groups, "   ")).toBe(groups);
  });
});
