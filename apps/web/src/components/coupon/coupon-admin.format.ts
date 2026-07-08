import { CouponAudience, CouponType, type CouponView } from '@app/contracts';

/** 表格标签色（Element Plus tag type 子集） */
export type CouponTagType = 'success' | 'warning' | 'info' | 'primary';

/** 优惠方式标签文案与颜色 */
export const COUPON_TYPE_META: Record<
  CouponType,
  { label: string; type: CouponTagType }
> = {
  [CouponType.Fixed]: { label: '满减', type: 'success' },
  [CouponType.Percent]: { label: '折扣', type: 'warning' },
};

/** 发放方式标签文案与颜色 */
export const COUPON_AUDIENCE_META: Record<
  CouponAudience,
  { label: string; type: CouponTagType }
> = {
  [CouponAudience.Public]: { label: '公开领取', type: 'info' },
  [CouponAudience.Directed]: { label: '定向发放', type: 'primary' },
};

/** 券面文案：满减 → 满 X 减 Y；折扣 → 满 X 可打 Z 折 */
export function couponFaceText(row: CouponView): string {
  const threshold =
    row.thresholdFen > 0 ? `满${row.thresholdFen / 100}元` : '无门槛';
  if (row.type === CouponType.Fixed) {
    return `${threshold}减${row.value / 100}元`;
  }
  return `${threshold}打${row.value / 1000}折`;
}

/** 领取进度百分比 */
export function couponUsagePercent(row: CouponView): number {
  if (row.totalCount <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((row.issuedCount / row.totalCount) * 100));
}

/** 剩余可领张数 */
export function couponRemainingCount(row: CouponView): number {
  return Math.max(row.totalCount - row.issuedCount, 0);
}

/** 日期时间展示 */
export function couponDateText(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
