import type { RouteComponent } from 'vue-router';

/** 组件懒加载器 */
type ComponentLoader = () => Promise<RouteComponent>;

/**
 * 菜单 code → 前端页面组件（懒加载）的注册表。
 * 后端只下发菜单元数据（标题/路径/图标/排序），组件归属前端，故以 code 在此登记。
 * 新增一个菜单 = 在 contracts 的 MENU_DEFINITIONS 增加一条 + 在此登记其组件。
 * 使用注册表而非按路径动态拼接，是为契合 Vite 静态分析以保证按需分包。
 */
const COMPONENT_REGISTRY: Record<string, ComponentLoader> = {
  'rbac:tenant:menu': () => import('@/views/rbac/TenantListView.vue'),
  'rbac:user:menu': () => import('@/views/rbac/UserListView.vue'),
  'rbac:role:menu': () => import('@/views/rbac/RoleListView.vue'),
  'rbac:permission:menu': () => import('@/views/rbac/PermissionListView.vue'),
  'config:menu': () => import('@/views/config/ConfigView.vue'),
  'upload:file:menu': () => import('@/views/upload/UploadView.vue'),
  'im:menu': () => import('@/views/im/ImView.vue'),
  'im:service:menu': () => import('@/views/im/ServiceConsoleView.vue'),
  'observability:log:menu': () => import('@/views/observability/LogView.vue'),
};

/** 按菜单 code 解析其页面组件加载器；未登记返回 undefined（该菜单不可路由） */
export function resolveMenuComponent(code: string): ComponentLoader | undefined {
  return COMPONENT_REGISTRY[code];
}
