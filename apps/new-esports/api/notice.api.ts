import type { NoticePopupView, NoticePublicView, PortalBannerView } from '@/types/notice';
import { http } from './http';

/** C 端运营通知/横幅只读接口（公开端点，免登录） */
export const noticeApi = {
  /** 首页运营横幅（未配置时 items 为空数组） */
  getBanner(): Promise<PortalBannerView> {
    return http.get('/notice/banner');
  },

  /** 启用中的通知（首页公告条与通知列表页共用） */
  list(): Promise<NoticePublicView[]> {
    return http.get('/notice/public');
  },

  /** 本租户最新一条弹窗公告（首次进入展示，无公告时为 null） */
  popup(): Promise<NoticePopupView | null> {
    return http.get('/notice/popup', { silent: true });
  },

  /** 单条通知详情（通知详情页） */
  detail(id: string): Promise<NoticePublicView> {
    return http.get(`/notice/public/${id}`);
  },
};
