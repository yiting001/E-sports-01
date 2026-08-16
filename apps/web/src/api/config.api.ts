import type {
  BrandingView,
  ConfigGroup,
  ConfigItemView,
  ConfigValueType,
  PortalConfigView,
  WechatPayCertUploadResult,
  WechatPayCertUsage,
} from '@app/contracts';
import type { AxiosRequestConfig } from 'axios';
import { http, type RequestOptions } from './http';

/** 新增/更新配置项入参 */
export interface UpsertConfigBody {
  key: string;
  value: string;
  type: ConfigValueType;
  group: ConfigGroup;
  remark?: string;
  secret?: boolean;
}

/** 配置中心接口 */
export const configApi = {
  list(group?: ConfigGroup): Promise<ConfigItemView[]> {
    return http.get('/config', { params: group ? { group } : undefined });
  },
  upsert(body: UpsertConfigBody): Promise<ConfigItemView> {
    return http.post('/config', body);
  },
  remove(key: string): Promise<void> {
    return http.delete(`/config/${encodeURIComponent(key)}`);
  },
  /** 上传微信支付证书文件（PEM/P12），服务端解析后写入敏感配置，不回传证书正文 */
  uploadWechatPayCert(
    file: File,
    usage: WechatPayCertUsage,
    password?: string,
  ): Promise<WechatPayCertUploadResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('usage', usage);
    if (password) {
      form.append('password', password);
    }
    return http.post('/config/wechat-pay-cert', form);
  },
  /** 读取平台品牌信息（公开，登录前即可调用） */
  branding(): Promise<BrandingView> {
    const options: AxiosRequestConfig & RequestOptions = {
      silent: true,
      tenantEntryProbe: true,
    };
    return http.get('/config/branding', options);
  },
  /** 读取门户开关配置（语音播报开关等，公开接口） */
  portal(): Promise<PortalConfigView> {
    const options: AxiosRequestConfig & RequestOptions = { silent: true };
    return http.get('/config/portal', options);
  },
};
