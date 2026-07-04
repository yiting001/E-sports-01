import type { NoticePublicView, PortalBannerView } from '@app/contracts';
import { http } from './http';

/**
 * C 端运营通知/横幅只读接口。
 * 走后端公开端点（免登录），仅返回启用中的通知与已配置的横幅图。
 */
export const noticeApi = {
  /** 首页运营横幅图片（未配置时 image 为空串） */
  getBanner(): Promise<PortalBannerView> {
    return http.get('/notice/banner');
  },
  /** 启用中的通知（公告条滚动 + 通知列表页共用） */
  list(): Promise<NoticePublicView[]> {
    return http.get('/notice/public');
  },
  /** 单条通知详情 */
  detail(id: string): Promise<NoticePublicView> {
    return http.get(`/notice/public/${id}`);
  },
};
