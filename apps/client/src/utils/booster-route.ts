import {
  BOOSTER_SERVICE_REGIONS,
  type BoosterServiceRegion,
} from '@app/contracts';

/** 只允许回到挑人流程内的 C 端页面，避免把 query 当成任意跳转目标。 */
export function safeBoosterReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '';
  }
  const pathname = value.split(/[?#]/, 1)[0] ?? '';
  return pathname === '/category' ||
    pathname.startsWith('/products/') ||
    pathname.startsWith('/checkout/')
    ? value
    : '';
}

export function parseBoosterServiceRegion(value: unknown): BoosterServiceRegion | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return BOOSTER_SERVICE_REGIONS.find((item) => item.value === value)?.value;
}
