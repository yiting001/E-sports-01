/**
 * 分类页 UI 演示数据（UI 先行阶段的占位数据，后续由后端接口替换）。
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

/** 综合页签：分组网格 */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'big-red',
    title: '大红单',
    items: [
      { id: 'c1', cover: '保底5个大红', name: '保底5个大红单' },
      { id: 'c2', cover: '单局大红', name: '单局大红单' },
      { id: 'c3', cover: '必出大红', name: '单局必出大红' },
      { id: 'c4', cover: '不出包赔', name: '不出航天服包赔' },
      { id: 'c5', cover: '必出12格', name: '必出12格背包' },
      { id: 'c6', cover: '必出一个', name: '必出一个大红' },
      { id: 'c7', cover: '三红一趟', name: '必出巴别塔三红' },
    ],
  },
  {
    id: 'carry',
    title: '单局带出单',
    items: [
      { id: 'c8', cover: '一单一辈子', name: '一单一辈子' },
      { id: 'c9', cover: '不出卫星', name: '不出卫星包赔' },
      { id: 'c10', cover: '满金满红', name: '满金满红单' },
      { id: 'c11', cover: '单局2把', name: '单局2把金' },
      { id: 'c12', cover: '连续2把', name: '连续2把大红' },
      { id: 'c13', cover: '单局12把', name: '单局12把带出' },
    ],
  },
];

/** 排行榜页签：按销量排序展示，heat 以榜首为 100 基准 */
export const RANK_LIST: RankItem[] = [
  { id: 'r1', title: '绝密体验单', sold: 515, heat: 100 },
  { id: 'r2', title: '怪兽卷死全网单', sold: 435, heat: 84 },
  { id: 'r3', title: '新人特购单', sold: 401, heat: 78 },
  { id: 'r4', title: '不清图不算保底单！', sold: 208, heat: 40 },
  { id: 'r5', title: '满金满红单【限时单】', sold: 143, heat: 28 },
];
