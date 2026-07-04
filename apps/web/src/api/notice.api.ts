import type {
  NoticeView,
  PaginatedResult,
  PortalBannerView,
  UpdatePortalBannerPayload,
  UpsertNoticePayload,
} from '@app/contracts';
import { http } from './http';

/** 运营通知管理接口：通知 CRUD + 首页横幅图片读写 */
export const noticeApi = {
  /** 分页查询通知列表 */
  list(page: number, pageSize: number): Promise<PaginatedResult<NoticeView>> {
    return http.get('/notice', { params: { page, pageSize } });
  },
  /** 新建通知 */
  create(payload: UpsertNoticePayload): Promise<NoticeView> {
    return http.post('/notice', payload);
  },
  /** 编辑通知 */
  update(id: string, payload: UpsertNoticePayload): Promise<NoticeView> {
    return http.put(`/notice/${id}`, payload);
  },
  /** 删除通知 */
  remove(id: string): Promise<void> {
    return http.delete(`/notice/${id}`);
  },
  /** 读取首页横幅图片 */
  getBanner(): Promise<PortalBannerView> {
    return http.get('/notice/banner');
  },
  /** 更新首页横幅图片（传空串即撤下横幅） */
  updateBanner(payload: UpdatePortalBannerPayload): Promise<PortalBannerView> {
    return http.put('/notice/banner', payload);
  },
};
