/**
 * 一级导航配置：移动端底部 TabBar 与 PC 顶部导航共用同一份数据源。
 */
import type { IconName } from './icon-paths';

/** 导航项 */
export interface NavItem {
  /** 路由名称（对应 router 定义） */
  name: string;
  /** 展示文案 */
  label: string;
  /** 图标名（AppIcon） */
  icon: IconName;
}

/** 四个一级 Tab */
export const NAV_ITEMS: NavItem[] = [
  { name: 'home', label: '首页', icon: 'home' },
  { name: 'category', label: '分类', icon: 'grid' },
  { name: 'messages', label: '消息', icon: 'bell' },
  { name: 'profile', label: '我的', icon: 'user' },
];
