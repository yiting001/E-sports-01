/**
 * 通知公告（前后端共享契约）。
 * 管理端维护平台通知（富文本详情，可启停/排序），
 * C 端首页公告条滚动展示启用中的通知，点击进入通知列表/详情页。
 */

/** 通知字段长度约束（DTO 校验与前端输入限制共享） */
export const NOTICE_LIMITS = {
  /** 标题最大长度 */
  titleMax: 128,
  /** 富文本详情最大长度（HTML 字符串） */
  contentMax: 10000,
} as const;

/** 首页横幅配置约束（管理端、DTO 与 C 端共享） */
export const PORTAL_BANNER_LIMITS = {
  itemsMax: 10,
  imageMax: 512,
  activityIdMax: 36,
  intervalMinSeconds: 1,
  intervalMaxSeconds: 3,
  defaultIntervalSeconds: 3,
} as const;

/** 新建/编辑通知入参 */
export interface UpsertNoticePayload {
  /** 通知标题（公告条滚动展示） */
  title: string;
  /** 通知详情（富文本 HTML，详情页展示） */
  content: string;
  /** 是否启用（仅启用的通知对 C 端可见） */
  enabled: boolean;
  /** 是否作为弹窗公告（C 端首次进入弹窗展示） */
  popup: boolean;
  /** 弹窗公告是否带火焰特效（仅 popup 为 true 时生效） */
  popupFlame: boolean;
  /** 排序权重，越小越靠前 */
  sort: number;
}

/** 通知视图（管理端） */
export interface NoticeView {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  popup: boolean;
  popupFlame: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

/** 通知公开视图（C 端，仅启用中的通知） */
export interface NoticePublicView {
  id: string;
  title: string;
  /** 富文本 HTML，前端须净化后渲染 */
  content: string;
  createdAt: string;
}

/**
 * 弹窗公告公开视图（C 端首次进入展示）。
 * 比普通公开视图多一个 `updatedAt`，作为弹窗版本号：
 * 内容更新后已关闭过的用户会重新看到弹窗。
 */
export interface NoticePopupView extends NoticePublicView {
  updatedAt: string;
  /** 是否渲染火焰特效边框 */
  popupFlame: boolean;
}

/** 首页运营横幅条目 */
export interface PortalBannerItem {
  /** 横幅图片 URL */
  image: string;
  /** 关联活动 ID；空串表示仅展示图片，不执行跳转 */
  activityId: string;
}

/** 首页运营横幅公开视图（C 端） */
export interface PortalBannerView {
  /** 轮播条目；未配置或全部无效时为空数组 */
  items: PortalBannerItem[];
  /** 自动轮播间隔（秒） */
  intervalSeconds: number;
}

/** 更新首页横幅入参（管理端） */
export type UpdatePortalBannerPayload = PortalBannerView;
