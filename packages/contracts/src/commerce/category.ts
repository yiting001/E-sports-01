/**
 * 商品分类契约（前后端共享）。
 * 分类是商品的一级归类（如「大红单」「护航单」），管理端维护、C 端只读展示。
 */

/** 分类管理视图（管理端列表/详情） */
export interface CategoryView {
  id: string;
  /** 分类名 */
  name: string;
  /** 封面短标语（C 端分类块展示，可空） */
  cover: string;
  /** 排序值，越小越靠前 */
  sort: number;
  /** 是否启用（停用后 C 端不展示，其下商品一并隐藏） */
  enabled: boolean;
  /** 该分类下的商品数（列表辅助展示） */
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

/** C 端只读分类视图（仅展示所需字段） */
export interface CategoryPublicView {
  id: string;
  name: string;
  cover: string;
}

/** 创建分类入参 */
export interface CreateCategoryPayload {
  name: string;
  cover?: string;
  sort?: number;
  enabled?: boolean;
}

/** 更新分类入参（按需部分更新） */
export interface UpdateCategoryPayload {
  name?: string;
  cover?: string;
  sort?: number;
  enabled?: boolean;
}
