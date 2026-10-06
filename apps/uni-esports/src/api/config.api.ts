import type {
  AgreementView,
  BrandingView,
  PortalConfigView,
} from '@app/contracts';
import { http } from './http';

/**
 * 配置类公开接口封装（小程序端）。
 * 品牌信息（软件名称/图标）与门户开关来自后台配置中心，登录前即可读取。
 */
export const configApi = {
  /** 读取平台品牌信息（软件名称 + 图标） */
  branding(): Promise<BrandingView> {
    return http.get('/config/branding');
  },

  /** 读取门户开关配置（登录方式显隐等） */
  portal(): Promise<PortalConfigView> {
    return http.get('/config/portal');
  },

  /** 读取用户协议正文（公开，登录前可访问；小程序内同时用作隐私政策载体） */
  agreement(): Promise<AgreementView> {
    return http.get('/config/agreement');
  },
};
