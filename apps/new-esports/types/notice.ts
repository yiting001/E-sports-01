/**
 * 通知/横幅契约的最小镜像（单一来源：packages/contracts/src/notice/notice.ts）。
 * 仅镜像本工程消费的字段；接入 workspace 后改用 @app/contracts。
 */

/** 通知公开视图（C 端，仅启用中的通知） */
export interface NoticePublicView {
  id: string;
  title: string;
  /** 富文本 HTML，渲染前须净化 */
  content: string;
  createdAt: string;
}

/**
 * 弹窗公告公开视图（首次进入展示）。
 * 比普通公开视图多一个 updatedAt，作为弹窗版本号：内容更新后已关闭过的用户会重新看到弹窗。
 */
export interface NoticePopupView extends NoticePublicView {
  updatedAt: string;
  /** 是否渲染火焰特效边框（本工程不引入装饰特效，仅保留字段） */
  popupFlame: boolean;
}

/** 首页运营横幅条目 */
export interface PortalBannerItem {
  /** 横幅图片 URL */
  image: string;
  /** 关联活动 ID；空串表示仅展示图片，不跳转 */
  activityId: string;
}

/** 首页运营横幅公开视图 */
export interface PortalBannerView {
  items: PortalBannerItem[];
  /** 自动轮播间隔（秒） */
  intervalSeconds: number;
}
