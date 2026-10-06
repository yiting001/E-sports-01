import type { ProductReviewPage } from '@app/contracts';
import { http } from './http';

/** C 端商品评论接口：公开只读（免登录），商品详情页评论区使用 */
export const reviewApi = {
  /** 商品可见评论分页（附带平均分） */
  listByProduct(
    productId: string,
    page: number,
    pageSize: number,
  ): Promise<ProductReviewPage> {
    return http.get(`/review/public/product/${productId}`, {
      params: { page, pageSize },
      silent: true,
    });
  },
};
