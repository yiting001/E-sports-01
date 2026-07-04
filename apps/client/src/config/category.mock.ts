/**
 * 分类页组件的视图模型类型。
 * 数据已改由后端公开接口下发，本文件仅保留组件所需的展示结构定义。
 */

/** 分类分组下的小项 */
export interface CategoryItem {
  id: string;
  /** 封面短标语（渲染在小方块封面上） */
  cover: string;
  /** 名称 */
  name: string;
}

/** 分类分组（综合页签） */
export interface CategoryGroup {
  id: string;
  title: string;
  items: CategoryItem[];
}

/** 排行榜条目（排行榜页签） */
export interface RankItem {
  id: string;
  title: string;
  /** 已售数量 */
  sold: number;
  /** 热度进度（0-100，驱动进度条宽度） */
  heat: number;
}
