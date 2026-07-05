import type { PaginatedResult } from '../common/pagination';

/**
 * 商品评论（前后端共享契约）。
 * 用户对「已完成」订单发表评分 + 文字评论（一单一评）；
 * 商品详情页公开展示可见评论与平均分；管理端可隐藏/恢复/删除评论。
 */

/** 评论字段约束（DTO 校验与前端输入限制共享） */
export const REVIEW_LIMITS = {
  /** 星级评分区间 */
  ratingMin: 1,
  ratingMax: 5,
  /** 评论内容长度区间 */
  contentMin: 1,
  contentMax: 500,
} as const;

/** 提交评论入参（订单维度：一张已完成订单只能评一次） */
export interface SubmitReviewPayload {
  /** 被评价的订单 id（须为本人已完成订单） */
  orderId: string;
  /** 星级评分（1-5） */
  rating: number;
  /** 评论内容 */
  content: string;
}

/** 管理端显隐评论入参 */
export interface SetReviewVisibilityPayload {
  /** true 恢复展示 / false 隐藏（违规评论不对外露出） */
  visible: boolean;
}

/** 评论公开视图（商品详情页展示，评论人昵称已脱敏） */
export interface ReviewPublicView {
  id: string;
  /** 脱敏后的评论人昵称（如「小*明」） */
  reviewerName: string;
  rating: number;
  content: string;
  createdAt: string;
}

/** 商品评论分页结果：在通用分页之上附带平均分 */
export interface ProductReviewPage extends PaginatedResult<ReviewPublicView> {
  /** 可见评论平均分（保留 1 位小数字符串；无评论为空串） */
  avgRating: string;
}

/** 管理端评论视图（补充评论人/订单/商品快照与可见状态） */
export interface AdminReviewView {
  id: string;
  userId: string;
  /** 评论人用户名（管理端展示） */
  username: string;
  /** 评论人昵称（管理端展示） */
  nickname: string;
  orderId: string;
  /** 商户订单号快照 */
  orderNo: string;
  productId: string;
  /** 商品标题快照（评论时固化） */
  productTitle: string;
  rating: number;
  content: string;
  /** 是否对外可见（false 为已隐藏） */
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}
