import type { RouteRecordRaw } from 'vue-router';
import { PERMS } from '@app/contracts';

/**
 * 路由 meta 约定。
 * permission 为空表示登录即可访问；否则需命中对应权限码才进入菜单与路由守卫。
 */
declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    icon?: string;
    permission?: string;
    public?: boolean;
  }
}

/** 业务路由（挂载于 AppLayout 之下，构成侧边菜单的数据源） */
export const businessRoutes: RouteRecordRaw[] = [
  {
    path: 'dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: '工作台', icon: 'HomeFilled' },
  },
  {
    path: 'rbac/users',
    name: 'rbac-users',
    component: () => import('@/views/rbac/UserListView.vue'),
    meta: { title: '用户管理', icon: 'User', permission: PERMS.user.list },
  },
  {
    path: 'rbac/roles',
    name: 'rbac-roles',
    component: () => import('@/views/rbac/RoleListView.vue'),
    meta: { title: '角色管理', icon: 'UserFilled', permission: PERMS.role.list },
  },
  {
    path: 'rbac/permissions',
    name: 'rbac-permissions',
    component: () => import('@/views/rbac/PermissionListView.vue'),
    meta: { title: '权限管理', icon: 'Key', permission: PERMS.permission.list },
  },
  {
    path: 'config',
    name: 'config',
    component: () => import('@/views/config/ConfigView.vue'),
    meta: { title: '配置中心', icon: 'Setting', permission: PERMS.config.list },
  },
  {
    path: 'upload',
    name: 'upload',
    component: () => import('@/views/upload/UploadView.vue'),
    meta: { title: '文件上传', icon: 'UploadFilled', permission: PERMS.file.list },
  },
  {
    path: 'im',
    name: 'im',
    component: () => import('@/views/im/ImView.vue'),
    meta: { title: '即时通讯', icon: 'ChatDotRound', permission: PERMS.im.history },
  },
];

/** 根路由表 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    redirect: '/dashboard',
    children: businessRoutes,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];
