import { CouponType, fenToYuan } from '@app/contracts';

/** 券面主文案：满减 → 减 X 元；折扣 → Y 折 */
export function couponFaceText(type: CouponType, value: number): string {
  if (type === CouponType.Fixed) {
    return `¥${fenToYuan(value)}`;
  }
  return `${(value / 1000).toFixed(1)}折`;
}

/** 门槛文案：0 = 无门槛 */
export function couponThresholdText(thresholdFen: number): string {
  return thresholdFen > 0 ? `满¥${fenToYuan(thresholdFen)}可用` : '无门槛';
}

/** 日期简短展示（券有效期） */
export function couponDateText(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
