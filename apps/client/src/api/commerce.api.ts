import type {
  CategoryPublicView,
  PaginatedResult,
  ProductPublicView,
} from '@app/contracts';
import { http } from './http';

/**
 * C 端商品/分类只读接口。
 * 走后端公开端点（免登录），仅返回启用分类与上架商品。
 */
export const commerceApi = {
  /** 启用中的分类（用于首页分类签、分类页分组） */
  listCategories(): Promise<CategoryPublicView[]> {
    return http.get('/commerce/public/categories');
  },
  /** 分页查询上架商品，可按分类过滤 */
  listProducts(params: {
    page: number;
    pageSize: number;
    categoryId?: string;
  }): Promise<PaginatedResult<ProductPublicView>> {
    return http.get('/commerce/public/products', { params });
  },
};
