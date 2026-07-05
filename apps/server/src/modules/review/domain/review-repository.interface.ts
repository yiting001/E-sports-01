import type { ReviewEntity } from './review.entity';

/** 管理端评论检索条件 */
export interface AdminReviewFilter {
  /** 按星级过滤 */
  rating?: number;
  /** 按可见状态过滤 */
  visible?: boolean;
}

export const REVIEW_REPOSITORY = Symbol('REVIEW_REPOSITORY');

/** 评论仓储接口（领域层只依赖抽象，实现在基础设施层，读操作按租户上下文过滤） */
export interface ReviewRepository {
  /** 按主键取评论 */
  findById(id: string): Promise<ReviewEntity | null>;
  /** 按订单取评论（一单一评的存在性检查） */
  findByOrderId(orderId: string): Promise<ReviewEntity | null>;
  /** 给定订单集合中，某用户已评论的订单 id 列表 */
  findReviewedOrderIds(userId: string, orderIds: string[]): Promise<string[]>;
  /** 商品可见评论分页，按发表时间倒序 */
  paginateVisibleByProduct(
    productId: string,
    skip: number,
    take: number,
  ): Promise<[ReviewEntity[], number]>;
  /** 商品可见评论平均分；无评论返回 null */
  avgRatingByProduct(productId: string): Promise<number | null>;
  /** 管理端分页检索全量评论（租户内），按发表时间倒序 */
  paginateAdmin(
    skip: number,
    take: number,
    filter: AdminReviewFilter,
  ): Promise<[ReviewEntity[], number]>;
  create(data: Partial<ReviewEntity>): ReviewEntity;
  save(entity: ReviewEntity): Promise<ReviewEntity>;
  remove(entity: ReviewEntity): Promise<void>;
}
