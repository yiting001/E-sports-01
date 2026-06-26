/**
 * 权限颗粒度类型。
 * RBAC 支持到 接口 / 菜单 / 按钮 三个级别。
 */
export enum PermissionType {
  /** 接口级：后端路由鉴权 */
  Api = 'api',
  /** 菜单级：前端动态路由 */
  Menu = 'menu',
  /** 按钮级：前端 v-permission 指令 */
  Button = 'button',
}

/** 权限节点（菜单/按钮/接口统一为一棵权限树） */
export interface PermissionNode {
  id: string;
  parentId: string | null;
  /** 权限码，例如 rbac:user:create */
  code: string;
  name: string;
  type: PermissionType;
  /** 菜单路由路径（type=menu 时有效） */
  path?: string | null;
  /** 前端组件路径（type=menu 时有效） */
  component?: string | null;
  /** 接口方法+路径（type=api 时有效），例如 POST /rbac/users */
  apiMethod?: string | null;
  apiPath?: string | null;
  icon?: string | null;
  sort: number;
  children?: PermissionNode[];
}
