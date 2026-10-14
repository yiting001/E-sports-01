/**
 * 会员进度换算（纯函数，可单测）。
 * 晋升进度按「已消费 / (已消费 + 距下一档还需)」计算，已是最高档（还需为 0）返回 null，
 * 由调用方决定是否展示进度条。
 */
export function memberProgressPercent(
  spendFen: number,
  nextNeedFen: number,
): number | null {
  if (!Number.isFinite(spendFen) || !Number.isFinite(nextNeedFen) || nextNeedFen <= 0) {
    return null;
  }
  const total = spendFen + nextNeedFen;
  if (total <= 0) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round((spendFen / total) * 100)));
}

/** 万分比基数（折扣/费率专用，10000 = 100%） */
export const FEE_RATE_BASE = 10000;

/**
 * 按万分比折扣计算折后应付金额（分），向上取整（分位归平台，保证平台不亏损）；
 * 折扣 ≥ 10000 或非法时按原价。
 */
export function calcDiscountedFen(amountFen: number, discountBp: number): number {
  if (discountBp <= 0 || discountBp >= FEE_RATE_BASE) {
    return amountFen;
  }
  return Math.ceil((amountFen * discountBp) / FEE_RATE_BASE);
}
