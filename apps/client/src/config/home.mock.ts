/**
 * 首页静态 UI 文案（横幅、公告、快捷入口）。
 * 这些是运营展示位文案，非业务数据；商品与分类已改由后端公开接口下发。
 */
import type { IconName } from './icon-paths';

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

/** 投诉入口条目 id，点击进入投诉反馈页 */
export const COMPLAINT_ENTRY_ID = 'complaint';

/** 三个运营快捷入口 */
export const QUICK_ENTRIES: QuickEntry[] = [
  { id: 'activity', icon: 'gift', banner: '老板消费活动', label: '老板消费活动入口' },
  { id: COMPLAINT_ENTRY_ID, icon: 'shield', banner: '投诉客服/打手', label: '投诉客服/打手入口' },
  { id: 'app', icon: 'download', banner: '官方APP下载', label: '怪兽官方APP下载' },
];
