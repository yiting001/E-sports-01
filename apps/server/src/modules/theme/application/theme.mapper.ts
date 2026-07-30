import { sanitizeThemeEffects, ThemeEffectsView } from '@app/contracts';
import type { ThemeSettingEntity } from '../domain/theme-setting.entity';

/** 实体 → 视图：解析 JSON 并过滤非法特效值，配置缺失/损坏时安全回退为空列表 */
export function toThemeEffectsView(
  entity: ThemeSettingEntity | null,
): ThemeEffectsView {
  if (!entity) {
    return { effects: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(entity.effects);
  } catch {
    parsed = [];
  }
  return { effects: sanitizeThemeEffects(parsed) };
}
