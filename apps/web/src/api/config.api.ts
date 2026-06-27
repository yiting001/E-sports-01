import type {
  BrandingView,
  ConfigGroup,
  ConfigItemView,
  ConfigValueType,
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
  /** 读取平台品牌信息（公开，登录前即可调用） */
  branding(): Promise<BrandingView> {
    const options: AxiosRequestConfig & RequestOptions = { silent: true };
    return http.get('/config/branding', options);
  },
};
