import type { ActivityPublicView } from '@app/contracts';
import { http } from './http';

/** 福利活动接口：进行中的活动列表与详情 */
export const activityApi = {
  /** 进行中的活动列表 */
  list(): Promise<ActivityPublicView[]> {
    return http.get('/activity/public');
  },
  /** 活动详情 */
  detail(id: string): Promise<ActivityPublicView> {
    return http.get(`/activity/public/${id}`);
  },
};
