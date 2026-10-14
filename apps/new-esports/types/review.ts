/**
 * 评论契约的最小镜像（单一来源：packages/contracts/src/review/review.ts）。
 * 仅镜像商品详情页消费的公开评论字段；接入 workspace 后改用 @app/contracts。
 */

import type { PaginatedResult } from './commerce';

/** 评论公开视图（商品详情页展示，评论人昵称已脱敏） */
export interface ReviewPublicView {
  id: string;
  /** 评论人展示昵称（真实用户脱敏；营销评论为自定义昵称原样展示） */
  reviewerName: string;
  /** 评论人头像 URL；空串由前端展示默认头像 */
  avatar: string;
  /** 星级评分（1-5） */
  rating: number;
  content: string;
  createdAt: string;
}

/** 商品评论分页结果：在通用分页之上附带平均分 */
export interface ProductReviewPage extends PaginatedResult<ReviewPublicView> {
  /** 可见评论平均分（保留 1 位小数字符串；无评论为空串） */
  avgRating: string;
}
