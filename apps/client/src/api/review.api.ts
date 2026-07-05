import type {
  AdminReviewView,
  ProductReviewPage,
  SubmitReviewPayload,
} from '@app/contracts';
import { http } from './http';

/** C 端评论接口：商品评论浏览 + 订单完成后发表评论 */
export const reviewApi = {
  /** 商品可见评论分页（免登录），附带平均分 */
  listByProduct(
    productId: string,
    page: number,
    pageSize: number,
  ): Promise<ProductReviewPage> {
    return http.get(`/review/public/product/${productId}`, {
      params: { page, pageSize },
    });
  },
  /** 对本人已完成订单发表评论（一单一评） */
  submit(payload: SubmitReviewPayload): Promise<AdminReviewView> {
    return http.post('/review', payload);
  },
  /** 给定订单集合中本人已评价的订单 id（我的订单页标记「已评价」） */
  reviewedOrderIds(orderIds: string[]): Promise<string[]> {
    return http.get('/review/mine/reviewed', {
      params: { orderIds: orderIds.join(',') },
    });
  },
};
