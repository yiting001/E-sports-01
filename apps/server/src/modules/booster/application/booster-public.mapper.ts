import {
  BoosterPublicView,
  BoosterLevelTier,
  formatBoosterDisplayName,
  resolveBoosterLevel,
} from '@app/contracts';
import { normalizeBoosterServiceRegions } from './booster-compatibility';
import type { BoosterDirectoryRecord } from '../domain/booster-directory.query';
import type { BoosterAvailability } from './booster-selection.service';

/** 公开显示名不回退登录用户名或申请人真实姓名。 */
export function resolveBoosterDisplayName(record: BoosterDirectoryRecord): string {
  return formatBoosterDisplayName(record.userId, record.nickname);
}

export function toBoosterPublicView(
  record: BoosterDirectoryRecord,
  tiers: BoosterLevelTier[],
  availability: BoosterAvailability = { selectable: true, unavailableReason: '' },
): BoosterPublicView {
  const tier = resolveBoosterLevel(tiers, record.completedOrders);
  return {
    userId: record.userId,
    displayName: resolveBoosterDisplayName(record),
    avatar: record.avatar,
    gender: record.gender,
    serviceRegions: normalizeBoosterServiceRegions(record.serviceRegions),
    intro: record.intro,
    completedOrders: record.completedOrders,
    level: tier.level,
    levelName: tier.name,
    voiceUrl: record.voiceUrl,
    online: record.acceptingOrders,
    selectable: availability.selectable,
    unavailableReason: availability.unavailableReason,
  };
}
