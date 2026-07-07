/**
 * 「我的」页 UI 演示数据（UI 先行阶段的占位数据，后续接入 RBAC/钱包/订单模块替换）。
 */
import type { IconName } from './icon-paths';

/** 图标入口（订单状态 / 更多功能共用结构） */
export interface IconEntry {
  id: string;
  /** 图标名（AppIcon） */
  icon: IconName;
  /** 名称 */
  label: string;
}

/** 我的订单五个状态入口 */
export const ORDER_ENTRIES: IconEntry[] = [
  { id: 'unpaid', icon: 'card', label: '待付款' },
  { id: 'waiting', icon: 'box', label: '待接单' },
  { id: 'serving', icon: 'crosshair', label: '服务中' },
  { id: 'settling', icon: 'file', label: '待结单' },
  { id: 'refund', icon: 'refund', label: '退款' },
];

/** 更多功能网格 */
export const FEATURE_ENTRIES: IconEntry[] = [
  { id: 'coupon-center', icon: 'ticket', label: '领券中心' },
  { id: 'my-coupons', icon: 'percent', label: '我的优惠券' },
  { id: 'vip', icon: 'crown', label: '会员等级' },
  { id: 'rank', icon: 'trophy', label: '排行榜' },
  { id: 'welfare', icon: 'gift', label: '福利活动' },
  { id: 'invite', icon: 'share', label: '邀请好友' },
  { id: 'join', icon: 'gamepad', label: '打手入驻' },
  { id: 'realname', icon: 'shield', label: '实名认证' },
  { id: 'announce', icon: 'megaphone', label: '公告通知' },
  { id: 'build', icon: 'wrench', label: '搭建同款电竞系统' },
];

/** 版本号展示文案（UI 占位，后续由构建注入） */
export const APP_VERSION_TEXT = '当前版本 17.8（179）';
