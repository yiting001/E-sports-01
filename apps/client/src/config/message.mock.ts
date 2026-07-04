/**
 * 消息页 UI 演示数据（UI 先行阶段的占位数据，后续接入 IM 模块替换）。
 */
import type { IconName } from './icon-paths';

/** 消息入口条目 */
export interface MessageEntry {
  id: string;
  /** 图标名（AppIcon） */
  icon: IconName;
  /** 标题 */
  title: string;
  /** 副标题/最近消息摘要 */
  subtitle: string;
  /** 右侧操作文案（可为空） */
  action?: string;
}

/** 客服入口条目 id，点击进入在线客服聊天 */
export const SERVICE_ENTRY_ID = 'service';

/** 官方消息页签内容 */
export const OFFICIAL_MESSAGES: MessageEntry[] = [
  {
    id: SERVICE_ENTRY_ID,
    icon: 'headset',
    title: '三角洲客服',
    subtitle: '三角洲在线客服',
    action: '点击联系',
  },
  {
    id: 'system',
    icon: 'file',
    title: '系统消息',
    subtitle: '暂无消息',
  },
];

/** 会话消息页签内容（暂无会话时展示空态） */
export const CHAT_MESSAGES: MessageEntry[] = [];
