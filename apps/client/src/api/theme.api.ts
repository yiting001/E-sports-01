import type { ThemeEffectsView } from '@app/contracts';
import { http, type RequestOptions } from './http';

/** C 端主题特效只读接口：走后端公开端点（免登录），按租户编码返回启用的背景特效 */
export const themeApi = {
  /** 本租户启用的背景特效（未配置时 effects 为空数组） */
  effects(tenantCode: string): Promise<ThemeEffectsView> {
    const options: RequestOptions = { params: { tenantCode }, silent: true };
    return http.get('/theme/effects', options);
  },
};
