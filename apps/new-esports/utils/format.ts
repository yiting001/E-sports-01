/**
 * 展示格式化工具（纯函数，可单测）。
 * 金额一律从「分」换算，禁止页面里自算浮点。
 */

/** 分转元字符串（整数分位运算，避免浮点误差） */
export function fenToYuan(fen: number): string {
  const sign = fen < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(fen));
  const yuan = Math.floor(abs / 100);
  const cents = abs % 100;
  return `${sign}${yuan}.${cents.toString().padStart(2, '0')}`;
}

/** 价格展示：¥ + 两位小数 */
export function priceLabel(fen: number): string {
  return `¥${fenToYuan(fen)}`;
}

/** 会员折扣（万分比）展示：10000 视为无折扣，9500 → 9.5 折 */
export function discountLabel(discountBp: number): string {
  if (!Number.isFinite(discountBp) || discountBp >= 10000 || discountBp <= 0) {
    return '无折扣';
  }
  const zhe = discountBp / 1000;
  return `${Number.isInteger(zhe) ? String(zhe) : zhe.toFixed(1)} 折`;
}

/**
 * 价格折扣文案（现价/原价折算为 N 折，与 apps/client 详情页角标同口径）。
 * 原价不高于现价（无折扣）时返回空串，供调用方隐藏角标。
 */
export function priceDiscountLabel(priceFen: number, originPriceFen: number): string {
  if (originPriceFen <= priceFen || originPriceFen <= 0) {
    return '';
  }
  const discount = (priceFen / originPriceFen) * 10;
  return `${Math.max(discount, 1).toFixed(1).replace(/\.0$/, '')}折`;
}

/** 日期时间展示：ISO 字符串或毫秒时间戳 → YYYY-MM-DD HH:mm；非法值返回空串 */
export function formatDateTime(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (input: number) => `${input}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 日期展示：ISO 字符串 → YYYY-MM-DD；非法值返回空串 */
export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
