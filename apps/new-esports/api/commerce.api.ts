import type {
  CategoryPublicView,
  PaginatedResult,
  ProductPublicView,
} from '@/types/commerce';
import { http } from './http';

/**
 * C 端商品/分类只读接口（公开端点，免登录）。
 * 仅返回启用分类与上架商品；关键字与分类过滤由服务端完成。
 */
export const commerceApi = {
  /** 启用中的分类（首页分类签） */
  listCategories(): Promise<CategoryPublicView[]> {
    return http.get('/commerce/public/categories');
  },

  /** 单个上架商品详情（详情页展示两端价格与富文本详情） */
  getProduct(id: string): Promise<ProductPublicView> {
    return http.get(`/commerce/public/products/${id}`);
  },

  /** 分页查询上架商品，可按分类与关键字过滤 */
  listProducts(params: {
    page: number;
    pageSize: number;
    categoryId?: string;
    keyword?: string;
  }): Promise<PaginatedResult<ProductPublicView>> {
    return http.get('/commerce/public/products', { params });
  },
};
