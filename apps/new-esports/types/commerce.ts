/**
 * 商品/分类契约的最小镜像（单一来源：packages/contracts/src/commerce/*）。
 * 仅镜像本工程页面消费到的字段；接入 pnpm workspace 后删除本文件，
 * 改为 `import type { CategoryPublicView, ProductPublicView } from '@app/contracts'`。
 * 新增字段前先对照上游契约，禁止在此定义业务规则。
 */

/** 分页查询结果 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** C 端只读分类视图 */
export interface CategoryPublicView {
  id: string;
  name: string;
  /** 分类短标语（无图标时作文字图标） */
  cover: string;
  /** 图标图片 URL；未设置为空串 */
  icon: string;
}

/** C 端只读商品视图（价格字段与两端现价，单位均为分） */
export interface ProductPublicView {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  /** 封面图片 URL；未设置为空串 */
  cover: string;
  /** 封面主标语 */
  coverTitle: string;
  /** 封面副标语 */
  coverSub: string;
  /** 商品详情（富文本 HTML，渲染前须净化） */
  description: string;
  /** 已售数量 */
  sold: number;
  /** 手机端现价（分） */
  priceFen: number;
  /** 手机端原价（分，未设置与现价相同） */
  originPriceFen: number;
  /** 电脑端现价（分） */
  pcPriceFen: number;
  /** 电脑端原价（分） */
  pcOriginPriceFen: number;
}
