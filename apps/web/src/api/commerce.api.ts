import type {
  CategoryView,
  CreateCategoryPayload,
  CreateProductPayload,
  PaginatedResult,
  ProductStatus,
  ProductView,
  PublishProductPayload,
  ServiceAgentOption,
  UpdateCategoryPayload,
  UpdateProductPayload,
} from '@app/contracts';
import { http } from './http';

/** 管理端商品/分类接口 */
export const commerceApi = {
  /** 分页查询分类 */
  listCategories(page: number, pageSize: number): Promise<PaginatedResult<CategoryView>> {
    return http.get('/commerce/categories', { params: { page, pageSize } });
  },
  /** 创建分类 */
  createCategory(payload: CreateCategoryPayload): Promise<CategoryView> {
    return http.post('/commerce/categories', payload);
  },
  /** 更新分类 */
  updateCategory(id: string, payload: UpdateCategoryPayload): Promise<CategoryView> {
    return http.patch(`/commerce/categories/${id}`, payload);
  },
  /** 删除分类 */
  removeCategory(id: string): Promise<void> {
    return http.delete(`/commerce/categories/${id}`);
  },

  /** 分页查询商品，可按分类/状态/关键字过滤 */
  listProducts(params: {
    page: number;
    pageSize: number;
    categoryId?: string;
    status?: ProductStatus;
    keyword?: string;
  }): Promise<PaginatedResult<ProductView>> {
    return http.get('/commerce/products', { params });
  },
  /** 创建商品 */
  createProduct(payload: CreateProductPayload): Promise<ProductView> {
    return http.post('/commerce/products', payload);
  },
  /** 更新商品 */
  updateProduct(id: string, payload: UpdateProductPayload): Promise<ProductView> {
    return http.patch(`/commerce/products/${id}`, payload);
  },
  /** 商品上下架 */
  publishProduct(id: string, payload: PublishProductPayload): Promise<ProductView> {
    return http.patch(`/commerce/products/${id}/status`, payload);
  },
  /** 删除商品 */
  removeProduct(id: string): Promise<void> {
    return http.delete(`/commerce/products/${id}`);
  },

  /** 查询可关联为负责客服的候选用户 */
  listServiceAgents(
    page: number,
    pageSize: number,
    keyword?: string,
  ): Promise<PaginatedResult<ServiceAgentOption>> {
    return http.get('/commerce/service-agents', { params: { page, pageSize, keyword } });
  },
};
