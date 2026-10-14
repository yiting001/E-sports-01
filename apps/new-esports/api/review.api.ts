import type { ProductReviewPage } from '@/types/review';
import { http } from './http';

/** C 端评论接口：商品评论浏览（公开端点，免登录） */
export const reviewApi = {
  /** 商品可见评论分页（附带平均分） */
  listByProduct(
    productId: string,
    page: number,
    pageSize: number,
  ): Promise<ProductReviewPage> {
    return http.get(`/review/public/product/${productId}`, {
      params: { page, pageSize },
    });
  },
};
