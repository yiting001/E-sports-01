/**
 * 从富文本商品详情中提取卡片摘要，避免在商品卡片中渲染原始 HTML。
 */
export function productCardSummary(description: string): string {
  return description
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
