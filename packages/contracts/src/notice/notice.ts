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

/** 新建/编辑通知入参 */
export interface UpsertNoticePayload {
  /** 通知标题（公告条滚动展示） */
  title: string;
  /** 通知详情（富文本 HTML，详情页展示） */
  content: string;
  /** 是否启用（仅启用的通知对 C 端可见） */
  enabled: boolean;
  /** 排序权重，越小越靠前 */
  sort: number;
}

/** 通知视图（管理端） */
export interface NoticeView {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
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

/** 首页运营横幅公开视图（C 端） */
export interface PortalBannerView {
  /** 横幅图片 URL；未配置为空串，前端回退默认样式 */
  image: string;
}

/** 更新首页横幅入参（管理端） */
export interface UpdatePortalBannerPayload {
  image: string;
}
