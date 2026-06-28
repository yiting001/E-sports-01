/**
 * 菜单（前后端共享单一来源）。
 * 菜单本质是 type=menu 的权限：后端据此播种菜单权限、按用户权限下发可见菜单；
 * 前端据此生成路由（code→组件懒加载）并以 code 作为路由守卫所需权限。
 */

/** 菜单分组：仅作侧边栏收纳的父容器，无路由、不作权限（前端据此把可见菜单收纳成树） */
export interface MenuGroup {
  /** 分组标识 */
  code: string;
  /** 分组标题 */
  title: string;
  /** 图标名（Element Plus 图标） */
  icon: string;
  /** 排序，越小越靠前 */
  sort: number;
}

/** 菜单定义：播种与前端路由共用的元数据（组件在前端按 code 注册，不入此表） */
export interface MenuDefinition {
  /** 菜单权限码，同时作为路由名与守卫权限；按「业务命名空间 + :menu」组织，例如 rbac:user:menu */
  code: string;
  /** 菜单标题 */
  title: string;
  /** 路由路径（相对 AppLayout），例如 rbac/users */
  path: string;
  /** 图标名（Element Plus 图标） */
  icon: string;
  /** 排序，越小越靠前 */
  sort: number;
  /** 所属分组 code（对应 MENU_GROUPS）；不填则在侧边栏顶层平铺 */
  group?: string;
}

/** 侧边栏菜单分组清单（收纳父节点，单一来源） */
export const MENU_GROUPS: MenuGroup[] = [
  { code: 'system', title: '系统管理', icon: 'Menu', sort: 10 },
  { code: 'communication', title: '在线沟通', icon: 'ChatLineRound', sort: 20 },
];

/** 当前用户可见的菜单视图（后端按权限过滤后下发） */
export interface MenuView {
  code: string;
  title: string;
  path: string;
  icon?: string | null;
  sort: number;
  children?: MenuView[];
}

/**
 * 受权限控制的菜单清单（不含「工作台」首页——首页登录即可见，无需单独授权）。
 * 后端播种为 menu 权限、用户分配后方可见；前端路由 meta.permission 取同名 code。
 */
export const MENU_DEFINITIONS: MenuDefinition[] = [
  { code: 'wallet:menu', title: '我的钱包', path: 'wallet', icon: 'Wallet', sort: 1 },
  {
    code: 'rbac:tenant:menu',
    title: '租户管理',
    path: 'rbac/tenants',
    icon: 'OfficeBuilding',
    sort: 5,
    group: 'system',
  },
  { code: 'rbac:user:menu', title: '用户管理', path: 'rbac/users', icon: 'User', sort: 10, group: 'system' },
  { code: 'rbac:role:menu', title: '角色管理', path: 'rbac/roles', icon: 'UserFilled', sort: 20, group: 'system' },
  {
    code: 'rbac:permission:menu',
    title: '权限管理',
    path: 'rbac/permissions',
    icon: 'Key',
    sort: 30,
    group: 'system',
  },
  { code: 'config:menu', title: '配置中心', path: 'config', icon: 'Setting', sort: 40, group: 'system' },
  { code: 'upload:file:menu', title: '文件上传', path: 'upload', icon: 'UploadFilled', sort: 50, group: 'system' },
  { code: 'observability:log:menu', title: '日志管理', path: 'logs', icon: 'Document', sort: 60, group: 'system' },
  { code: 'im:menu', title: '即时通讯', path: 'im', icon: 'ChatDotRound', sort: 70, group: 'communication' },
  { code: 'im:service:menu', title: '客服工作台', path: 'im/service', icon: 'Service', sort: 80, group: 'communication' },
];
