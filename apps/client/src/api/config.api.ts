import type { BrandingView, PortalConfigView } from '@app/contracts';
import { http, type RequestOptions } from './http';

const tenantProbeOptions: RequestOptions = { tenantEntryProbe: true };

/**
 * 配置类公开接口封装（C 端）。
 * 品牌信息（软件名称/图标）来自后台配置中心，登录前即可读取，
 * 与管理端共用同一配置来源。
 */
export const configApi = {
  /** 读取平台品牌信息（软件名称 + 图标） */
  branding(): Promise<BrandingView> {
    return http.get('/config/branding', tenantProbeOptions);
  },

  /** 读取门户开关配置（排行榜显隐等） */
  portal(): Promise<PortalConfigView> {
    return http.get('/config/portal', tenantProbeOptions);
  },
};
