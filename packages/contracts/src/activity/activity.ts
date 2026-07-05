/**
 * 福利活动（前后端共享契约）。
 * 管理端发布运营活动（封面/富文本详情/起止时间，可启停/排序），
 * C 端「福利活动」列表浏览进行中的活动，点击查看详情。
 */

/** 活动字段长度约束（DTO 校验与前端输入限制共享） */
export const ACTIVITY_LIMITS = {
  /** 标题最大长度 */
  titleMax: 64,
  /** 封面图 URL 最大长度 */
  coverMax: 512,
  /** 富文本详情最大长度（HTML 字符串） */
  contentMax: 20000,
} as const;

/** 新建/编辑活动入参（管理端） */
export interface UpsertActivityPayload {
  /** 活动标题 */
  title: string;
  /** 封面图 URL（可为空串，列表回退纯文字卡片） */
  cover: string;
  /** 活动详情（富文本 HTML） */
  content: string;
  /** 活动开始（ISO 时间） */
  startAt: string;
  /** 活动结束（ISO 时间） */
  endAt: string;
  /** 是否启用（仅启用且在起止时间内的活动对 C 端可见） */
  enabled: boolean;
  /** 排序权重，越小越靠前 */
  sort: number;
}

/** 活动视图（管理端） */
export interface ActivityView extends UpsertActivityPayload {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** 活动公开视图（C 端，仅启用且进行中） */
export interface ActivityPublicView {
  id: string;
  title: string;
  cover: string;
  /** 富文本 HTML，前端须净化后渲染 */
  content: string;
  startAt: string;
  endAt: string;
}
