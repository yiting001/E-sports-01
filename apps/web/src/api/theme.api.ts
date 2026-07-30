import type { ThemeEffect, ThemeEffectsView } from '@app/contracts';
import { http } from './http';

/** 主题特效管理接口：按当前租户读写 C 端启用的背景特效 */
export const themeApi = {
  /** 读取当前租户主题特效配置 */
  getEffects(): Promise<ThemeEffectsView> {
    return http.get('/theme/admin/effects');
  },
  /** 整量覆盖当前租户主题特效配置（空数组即全部关闭） */
  updateEffects(effects: ThemeEffect[]): Promise<ThemeEffectsView> {
    return http.put('/theme/admin/effects', { effects });
  },
};
