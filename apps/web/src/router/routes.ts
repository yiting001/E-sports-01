import type { RouteRecordRaw } from 'vue-router';
import type { MenuView } from '@app/contracts';
import { resolveMenuComponent } from './component-registry';

/**
 * 路由 meta 约定。
 * permission 为空表示登录即可访问；否则需命中对应权限码（菜单 code）才进入路由守卫。
 */
declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    icon?: string;
    permission?: string;
    public?: boolean;
  }
}

/** 挂载动态菜单路由的父路由名（AppLayout） */
export const LAYOUT_ROUTE_NAME = 'layout';

/**
 * 静态根路由表。
 * 仅保留登录、布局骨架与工作台首页；业务菜单路由由后端菜单动态注册（见 guard）。
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    name: LAYOUT_ROUTE_NAME,
    component: () => import('@/layouts/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '工作台', icon: 'HomeFilled' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/profile/ProfileView.vue'),
        meta: { title: '个人中心' },
      },
      {
        path: 'realname/me',
        name: 'realname-me',
        component: () => import('@/views/realname/RealnameMineView.vue'),
        meta: { title: '实名认证' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

/**
 * 将后端下发的菜单转换为路由记录（挂载于 AppLayout 之下）。
 * 以菜单 code 同时作为路由名与所需权限；未登记组件的菜单不可路由（返回 null）。
 */
export function menuToRoute(menu: MenuView): RouteRecordRaw | null {
  const component = resolveMenuComponent(menu.code);
  if (!component) {
    return null;
  }
  return {
    path: menu.path,
    name: menu.code,
    component,
    meta: {
      title: menu.title,
      icon: menu.icon ?? undefined,
      permission: menu.code,
    },
  };
}
