/**
 * 商品（陪玩单）契约（前后端共享）。
 * 商品归属某个分类，可关联一名「负责客服」（用户下单后由该客服处理/拉群），
 * 支持上下架与排序。价格统一以「分」为单位存储，避免浮点误差。
 */
import type { PaginationQuery } from '../common/pagination';
import type { ProductStatus } from './product-status';

/** 商品管理视图（管理端列表/详情） */
export interface ProductView {
  id: string;
  /** 所属分类 id */
  categoryId: string;
  /** 所属分类名（冗余展示，免二次查询） */
  categoryName: string;
  /** 商品名 */
  title: string;
  /** 封面图片 URL；未设置为空串 */
  cover: string;
  /** 封面主标语 */
  coverTitle: string;
  /** 封面副标语 */
  coverSub: string;
  /** 商品详情（富文本 HTML） */
  description: string;
  /** 现价（分） */
  priceFen: number;
  /** 划线原价（分） */
  originPriceFen: number;
  /** 已售数量 */
  sold: number;
  /** 关联负责客服的用户 id；未关联为空串 */
  serviceAgentId: string;
  /** 关联负责客服展示名；未关联为空串 */
  serviceAgentName: string;
  /** 上下架状态 */
  status: ProductStatus;
  /** 排序值，越小越靠前 */
  sort: number;
  createdAt: string;
  updatedAt: string;
}

/** C 端只读商品视图（不含客服/状态等管理字段） */
export interface ProductPublicView {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  /** 封面图片 URL；未设置为空串 */
  cover: string;
  coverTitle: string;
  coverSub: string;
  /** 商品详情（富文本 HTML） */
  description: string;
  priceFen: number;
  originPriceFen: number;
  sold: number;
}

/** 创建商品入参 */
export interface CreateProductPayload {
  categoryId: string;
  title: string;
  /** 封面图片 URL（选填） */
  cover?: string;
  coverTitle: string;
  coverSub?: string;
  /** 商品详情（富文本 HTML，选填） */
  description?: string;
  priceFen: number;
  originPriceFen: number;
  /** 关联负责客服的用户 id（选填） */
  serviceAgentId?: string;
  sort?: number;
}

/** 更新商品入参（按需部分更新） */
export interface UpdateProductPayload {
  categoryId?: string;
  title?: string;
  cover?: string;
  coverTitle?: string;
  coverSub?: string;
  description?: string;
  priceFen?: number;
  originPriceFen?: number;
  serviceAgentId?: string;
  sort?: number;
  /** 已售数量（营销工具可编辑） */
  sold?: number;
}

/** 上下架入参 */
export interface PublishProductPayload {
  status: ProductStatus;
}

/** 管理端商品分页查询：可按分类、状态、关键字过滤 */
export interface ProductListQuery extends PaginationQuery {
  categoryId?: string;
  status?: ProductStatus;
  keyword?: string;
}

/** C 端商品分页查询：可按分类、关键字过滤（仅返回上架商品） */
export interface ProductPublicQuery extends PaginationQuery {
  categoryId?: string;
  keyword?: string;
}

/** 可关联为「负责客服」的候选用户（管理端商品表单选择器用） */
export interface ServiceAgentOption {
  id: string;
  username: string;
  nickname: string;
}
