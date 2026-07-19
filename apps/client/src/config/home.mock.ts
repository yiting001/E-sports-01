/**
 * 首页静态 UI 文案（快捷入口）。
 * 这些是运营展示位文案，非业务数据；商品/分类/横幅/公告均由后端接口下发。
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

/** 活动入口条目 id，点击进入活动中心页 */
export const ACTIVITY_ENTRY_ID = 'activity';

/** 投诉入口条目 id，点击进入投诉反馈页 */
export const COMPLAINT_ENTRY_ID = 'complaint';

/** 挑选打手入口条目 id，点击进入打手目录 */
export const BOOSTER_DIRECTORY_ENTRY_ID = 'booster-directory';

/** 三个运营快捷入口 */
export const QUICK_ENTRIES: QuickEntry[] = [
  { id: ACTIVITY_ENTRY_ID, icon: 'gift', banner: '老板消费活动', label: '老板消费活动入口' },
  { id: COMPLAINT_ENTRY_ID, icon: 'shield', banner: '投诉客服/打手', label: '投诉客服/打手入口' },
  { id: BOOSTER_DIRECTORY_ENTRY_ID, icon: 'gamepad', banner: '挑选打手', label: '挑选打手入口' },
];
