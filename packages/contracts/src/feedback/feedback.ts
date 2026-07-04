/**
 * 反馈/投诉（前后端共享契约）。
 * C 端用户对客服/打手等对象提交投诉反馈，管理端受理并回复处理结果；
 * 状态机：pending（待处理）→ resolved（已处理，附处理回复）。
 */

/** 反馈类型：投诉对象分类 */
export enum FeedbackType {
  /** 投诉打手 */
  Booster = 'booster',
  /** 投诉客服 */
  Service = 'service',
  /** 其他反馈 */
  Other = 'other',
}

/** 反馈处理状态 */
export enum FeedbackStatus {
  /** 已提交，待处理 */
  Pending = 'pending',
  /** 已处理（附处理回复） */
  Resolved = 'resolved',
}

/** 反馈类型 → 展示文案（前端展示单一来源） */
export const FEEDBACK_TYPE_TEXT: Record<FeedbackType, string> = {
  [FeedbackType.Booster]: '投诉打手',
  [FeedbackType.Service]: '投诉客服',
  [FeedbackType.Other]: '其他反馈',
};

/** 反馈内容长度约束（DTO 校验与前端输入限制共享） */
export const FEEDBACK_LIMITS = {
  /** 被投诉对象名称最大长度 */
  targetMax: 64,
  /** 反馈内容长度区间 */
  contentMin: 5,
  contentMax: 500,
  /** 处理回复最大长度 */
  replyMax: 500,
} as const;

/** 提交反馈入参 */
export interface SubmitFeedbackPayload {
  /** 反馈类型 */
  type: FeedbackType;
  /** 被投诉对象（打手/客服的昵称或单号等线索，可空） */
  target?: string;
  /** 反馈内容 */
  content: string;
}

/** 处理反馈入参 */
export interface HandleFeedbackPayload {
  /** 处理回复（告知用户处理结果） */
  replyContent: string;
}

/** 反馈视图（管理端列表 / 用户本人查看共用） */
export interface FeedbackView {
  id: string;
  userId: string;
  /** 提交人用户名（管理端展示） */
  username: string;
  /** 提交人昵称（管理端展示） */
  nickname: string;
  type: FeedbackType;
  target: string;
  content: string;
  status: FeedbackStatus;
  /** 处理回复；未处理为空串 */
  replyContent: string;
  /** 处理人用户 id；未处理为空串 */
  handledBy: string;
  /** 处理时间 ISO 串；未处理为空串 */
  handledAt: string;
  createdAt: string;
  updatedAt: string;
}
