/**
 * 菜单（前后端共享单一来源）。
 * 菜单本质是 type=menu 的权限：后端据此播种菜单权限、按用户权限下发可见菜单；
 * 前端据此生成路由（code→组件懒加载）并以 code 作为路由守卫所需权限。
 */

/** 菜单定义：播种与前端路由共用的元数据（组件在前端按 code 注册，不入此表） */
export interface MenuDefinition {
  /** 菜单权限码，同时作为路由名与守卫权限，例如 menu:rbac:user */
  code: string;
  /** 菜单标题 */
  title: string;
  /** 路由路径（相对 AppLayout），例如 rbac/users */
  path: string;
  /** 图标名（Element Plus 图标） */
  icon: string;
  /** 排序，越小越靠前 */
  sort: number;
}

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
  { code: 'menu:rbac:user', title: '用户管理', path: 'rbac/users', icon: 'User', sort: 10 },
  { code: 'menu:rbac:role', title: '角色管理', path: 'rbac/roles', icon: 'UserFilled', sort: 20 },
  {
    code: 'menu:rbac:permission',
    title: '权限管理',
    path: 'rbac/permissions',
    icon: 'Key',
    sort: 30,
  },
  { code: 'menu:config', title: '配置中心', path: 'config', icon: 'Setting', sort: 40 },
  { code: 'menu:upload', title: '文件上传', path: 'upload', icon: 'UploadFilled', sort: 50 },
  { code: 'menu:im', title: '即时通讯', path: 'im', icon: 'ChatDotRound', sort: 60 },
  { code: 'menu:im:service', title: '客服工作台', path: 'im/service', icon: 'Service', sort: 70 },
  { code: 'menu:logs', title: '日志管理', path: 'logs', icon: 'Document', sort: 80 },
];
