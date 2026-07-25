/**
 * 分类页组件的视图模型类型。
 * 数据已改由后端公开接口下发，本文件仅保留组件所需的展示结构定义。
 */
import type { ProductPublicView } from '@app/contracts';

/** 分类目录分组（左侧索引 + 右侧商品入口） */
export interface CategoryGroup {
  id: string;
  title: string;
  /** 图标图片 URL（有则以图片图标展示，可空） */
  icon: string;
  /** 文字图标（无图标图片时展示，可空） */
  iconText: string;
  /** 该分类下的上架商品，保留完整公开字段供明细卡展示 */
  items: ProductPublicView[];
}

/** 排行榜条目（保留给独立排行榜展示） */
export interface RankItem {
  product: ProductPublicView;
  /** 热度进度（0-100，驱动进度条宽度） */
  heat: number;
}
