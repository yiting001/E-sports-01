import type {
  NoticePopupView,
  NoticePublicView,
  PortalBannerView,
} from '@app/contracts';
import { http, type RequestOptions } from './http';

/**
 * C 端运营通知/横幅只读接口。
 * 走后端公开端点（免登录），仅返回启用中的通知与已配置的横幅。
 */
export const noticeApi = {
  /** 首页运营横幅（未配置时 items 为空数组） */
  getBanner(): Promise<PortalBannerView> {
    return http.get('/notice/banner');
  },
  /** 启用中的通知（公告条滚动 + 通知列表页共用） */
  list(): Promise<NoticePublicView[]> {
    return http.get('/notice/public');
  },
  /** 本租户最新一条弹窗公告（首次进入展示，无公告时为 null） */
  popup(tenantCode: string): Promise<NoticePopupView | null> {
    const options: RequestOptions = { params: { tenantCode }, silent: true };
    return http.get('/notice/popup', options);
  },
  /** 单条通知详情 */
  detail(id: string): Promise<NoticePublicView> {
    return http.get(`/notice/public/${id}`);
  },
};
