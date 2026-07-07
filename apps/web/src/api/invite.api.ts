import type {
  InviteConfigView,
  InviteRecordAdminView,
  PaginatedResult,
} from '@app/contracts';
import { http } from './http';

/** 邀请管理接口：奖励配置读写 + 邀请记录查询 */
export const inviteApi = {
  /** 读取邀请奖励配置 */
  getConfig(): Promise<InviteConfigView> {
    return http.get('/invite/admin/config');
  },
  /** 保存邀请奖励配置 */
  saveConfig(payload: InviteConfigView): Promise<void> {
    return http.put('/invite/admin/config', payload);
  },
  /** 分页查询邀请记录 */
  records(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<InviteRecordAdminView>> {
    return http.get('/invite/admin/records', { params: { page, pageSize } });
  },
};
