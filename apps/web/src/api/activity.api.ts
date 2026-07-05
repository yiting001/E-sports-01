import type {
  ActivityView,
  PaginatedResult,
  UpsertActivityPayload,
} from '@app/contracts';
import { http } from './http';

/** 福利活动管理接口：活动 CRUD */
export const activityApi = {
  /** 分页查询活动列表 */
  list(page: number, pageSize: number): Promise<PaginatedResult<ActivityView>> {
    return http.get('/activity/admin', { params: { page, pageSize } });
  },
  /** 发布活动 */
  create(payload: UpsertActivityPayload): Promise<ActivityView> {
    return http.post('/activity/admin', payload);
  },
  /** 编辑活动 */
  update(id: string, payload: UpsertActivityPayload): Promise<ActivityView> {
    return http.put(`/activity/admin/${id}`, payload);
  },
  /** 删除活动 */
  remove(id: string): Promise<void> {
    return http.delete(`/activity/admin/${id}`);
  },
};
