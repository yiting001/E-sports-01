/**
 * 首页 UI 演示数据（UI 先行阶段的占位数据，后续由后端接口替换）。
 * 集中在 config 目录统一维护，组件内禁止散落写死业务文案。
 */
import type { IconName } from './icon-paths';

/** 商品卡片（陪玩单） */
export interface ProductItem {
  id: string;
  /** 封面主标语（渲染在暗绿科技风封面上） */
  coverTitle: string;
  /** 封面副标语 */
  coverSub: string;
  /** 商品名 */
  title: string;
  /** 卖点描述 */
  desc: string;
  /** 现价（分） */
  priceFen: number;
  /** 划线原价（分） */
  originPriceFen: number;
  /** 已售数量 */
  sold: number;
}

/** 快捷入口 */
export interface QuickEntry {
  id: string;
  /** 图标名（AppIcon） */
  icon: IconName;
  /** 卡片内标语 */
  banner: string;
  /** 卡片下方说明 */
  label: string;
}

/** 顶部横幅文案 */
export const HOME_BANNER = {
  title: '制作同款小程序',
  subTitle: '承包客服管理售后包你满意',
  tagLeft: '欢迎前来咨询',
  tagRight: '限时降价1.5w',
  contact: '搜索服务号：gs2026666',
  scanTip: '或扫码关注',
};

/** 滚动公告 */
export const HOME_NOTICE =
  '单！如果打手服务不好联系客服免单！如果打手有私加直接联系客服举报！';

/** 三个运营快捷入口 */
export const QUICK_ENTRIES: QuickEntry[] = [
  { id: 'activity', icon: 'gift', banner: '老板消费活动', label: '老板消费活动入口' },
  { id: 'complaint', icon: 'shield', banner: '投诉客服/打手', label: '投诉客服/打手入口' },
  { id: 'app', icon: 'download', banner: '官方APP下载', label: '怪兽官方APP下载' },
];

/** 商品分类签 */
export const CATEGORY_CHIPS = [
  '电竞导师单',
  '趣味单',
  '清图单',
  '单局带出单',
  '出红单',
  '大红单',
  '护航单',
];

/** 首页商品列表 */
export const HOME_PRODUCTS: ProductItem[] = [
  {
    id: 'p1',
    coverTitle: '绝密保底500-1000万',
    coverSub: '每人仅此一单',
    title: '新人特购单',
    desc: '新人特购单每人限购一单 保底500w~1000w 怪兽性价比之王',
    priceFen: 4880,
    originPriceFen: 12800,
    sold: 200062,
  },
  {
    id: 'p2',
    coverTitle: '绝密体验单',
    coverSub: '保底500W-1000W',
    title: '绝密体验单',
    desc: '打绝密局 保底最低500万~1000万最高保底无上限！绝对超值',
    priceFen: 5900,
    originPriceFen: 18888,
    sold: 182447,
  },
  {
    id: 'p3',
    coverTitle: '怪兽卷死全网单',
    coverSub: '性价比天花板',
    title: '怪兽卷死全网单',
    desc: '全网最低价 高强度带飞 不满意随时找客服售后',
    priceFen: 6800,
    originPriceFen: 16800,
    sold: 143520,
  },
  {
    id: 'p4',
    coverTitle: '满金满红单',
    coverSub: '限时特惠',
    title: '满金满红单【限时单】',
    desc: '满金色装备满红色收益 单局不达标直接补单',
    priceFen: 8800,
    originPriceFen: 26800,
    sold: 98210,
  },
];
