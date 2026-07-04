import type { RouteRecordRaw } from 'vue-router';

/**
 * 路由 meta 约定。
 * public 为真表示无需登录即可访问（仅登录页）；其余路由默认需要登录。
 */
declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    public?: boolean;
  }
}

/**
 * 用户端静态路由表。
 * 结构精简：一个公开的登录/注册页 + 一个需要登录的用户首页。
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
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '用户中心' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];
