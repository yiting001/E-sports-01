/**
 * 反馈/投诉（前后端共享契约）。
 * C 端用户对客服/打手等对象提交投诉反馈，管理端受理并回复处理结果；
 * 状态机：pending（待处理）→ resolved（已处理，附处理回复）。
 */

import type { PenaltySource } from '../booster/penalty';

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

interface SubmitFeedbackPayloadBase {
  /** 反馈内容 */
  content: string;
}

/** 投诉打手时必须关联结构化订单，禁止提交自由文本对象。 */
export interface SubmitBoosterFeedbackPayload extends SubmitFeedbackPayloadBase {
  type: FeedbackType.Booster;
  orderId: string;
  target?: never;
}

/** 投诉客服或其他反馈不允许夹带订单关联。 */
export interface SubmitGeneralFeedbackPayload extends SubmitFeedbackPayloadBase {
  type: FeedbackType.Service | FeedbackType.Other;
  target?: string;
  orderId?: never;
}

/** 提交反馈入参；类型决定订单关联是否必填。 */
export type SubmitFeedbackPayload = SubmitBoosterFeedbackPayload | SubmitGeneralFeedbackPayload;

/** 处理反馈入参 */
export interface HandleFeedbackPayload {
  /** 处理回复（告知用户处理结果） */
  replyContent: string;
}

/** 从投诉记录直接对关联订单打手扣款的入参 */
export interface CreateFeedbackPenaltyBody {
  /** 罚款金额（分，正整数） */
  amountFen: number;
  /** 从钱包余额或押金扣除 */
  source: PenaltySource;
  /** 内部处罚原因，写入罚款审计记录 */
  reason: string;
  /** 用户可见的处理回复 */
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
  /** 关联服务订单 id；非打手投诉或历史未识别记录为空串 */
  orderId: string;
  /** 服务端固化的订单号 */
  orderNo: string;
  /** 服务端从订单固化的实际接单打手用户 id */
  boosterUserId: string;
  /** 服务端从订单固化的实际接单打手显示名 */
  boosterName: string;
  /** 直接扣款生成的罚款记录 id；尚未扣款为空串 */
  penaltyId: string;
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
