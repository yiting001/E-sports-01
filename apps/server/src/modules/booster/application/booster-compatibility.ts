import {
  BOOSTER_LEGACY_LIMITS,
  BOOSTER_SERVICE_REGION_VALUES,
  type BoosterServiceRegion,
} from '@app/contracts';

/** 旧列只承担 migration 回滚兼容，写入时按旧 schema 长度安全截断。 */
export function toLegacyGameNickname(applicantName: string): string {
  return Array.from(applicantName).slice(0, BOOSTER_LEGACY_LIMITS.gameNicknameMax).join('');
}

export function toLegacyGameName(serviceRegions: readonly BoosterServiceRegion[]): string {
  return serviceRegions.join(',').slice(0, BOOSTER_LEGACY_LIMITS.gameNameMax);
}

/** 清理 migration 前的自由文本区服，避免把不属于新契约的值返回给前端。 */
export function normalizeBoosterServiceRegions(
  serviceRegions: readonly string[],
): BoosterServiceRegion[] {
  return serviceRegions.filter((value): value is BoosterServiceRegion =>
    BOOSTER_SERVICE_REGION_VALUES.some((allowed) => allowed === value),
  );
}
