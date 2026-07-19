import { PORTAL_BANNER_LIMITS, type PortalBannerItem, type PortalBannerView } from '@app/contracts';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPPORTED_IMAGE_PATTERN = /^(https?:\/\/|\/)/i;

export function emptyPortalBanner(): PortalBannerView {
  return {
    items: [],
    intervalSeconds: PORTAL_BANNER_LIMITS.defaultIntervalSeconds,
  };
}

/** 将配置中心中的历史图片 URL 或 JSON 统一转换为当前横幅结构。 */
export function parsePortalBannerConfig(raw: string | null): PortalBannerView {
  const source = raw?.trim() ?? '';
  if (!source) {
    return emptyPortalBanner();
  }

  try {
    return normalizePortalBanner(JSON.parse(source));
  } catch {
    return normalizePortalBanner(source);
  }
}

/** 对配置中心可被直接编辑产生的脏数据做收敛，公开接口仅下发安全结构。 */
export function normalizePortalBanner(value: unknown): PortalBannerView {
  if (typeof value === 'string') {
    const item = normalizeItem({ image: value, activityId: '' });
    return item
      ? { items: [item], intervalSeconds: PORTAL_BANNER_LIMITS.defaultIntervalSeconds }
      : emptyPortalBanner();
  }
  if (!isRecord(value)) {
    return emptyPortalBanner();
  }

  const legacyItem = normalizeItem({ image: value.image, activityId: '' });
  const sourceItems = Array.isArray(value.items) ? value.items : legacyItem ? [legacyItem] : [];
  const items = sourceItems
    .slice(0, PORTAL_BANNER_LIMITS.itemsMax)
    .map(normalizeItem)
    .filter((item): item is PortalBannerItem => item !== null);
  const intervalSeconds = isIntervalSeconds(value.intervalSeconds)
    ? value.intervalSeconds
    : PORTAL_BANNER_LIMITS.defaultIntervalSeconds;

  return { items, intervalSeconds };
}

function normalizeItem(value: unknown): PortalBannerItem | null {
  if (!isRecord(value) || typeof value.image !== 'string') {
    return null;
  }
  const image = value.image.trim();
  if (
    !image ||
    image.length > PORTAL_BANNER_LIMITS.imageMax ||
    !SUPPORTED_IMAGE_PATTERN.test(image)
  ) {
    return null;
  }
  const activityId =
    typeof value.activityId === 'string' && UUID_V4_PATTERN.test(value.activityId.trim())
      ? value.activityId.trim()
      : '';
  return { image, activityId };
}

function isIntervalSeconds(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >= PORTAL_BANNER_LIMITS.intervalMinSeconds &&
    Number(value) <= PORTAL_BANNER_LIMITS.intervalMaxSeconds
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
