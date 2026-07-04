/**
 * 商品上下架状态（前后端共享单一来源）。
 * 下架商品仅管理端可见，C 端商品列表只返回上架商品。
 */
export enum ProductStatus {
  /** 上架：C 端可见、可下单 */
  OnShelf = 'on_shelf',
  /** 下架：仅管理端可见 */
  OffShelf = 'off_shelf',
}
