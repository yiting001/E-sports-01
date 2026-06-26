/** 路由元数据键，集中定义避免散落的魔法字符串 */
export const AUTH_METADATA = {
  /** 标记公开路由，跳过 JWT 鉴权 */
  isPublic: 'auth:isPublic',
  /** 标记访问所需的权限码集合 */
  permissions: 'auth:permissions',
} as const;

/** 注入到请求上下文的当前登录用户 */
export interface AuthUser {
  id: string;
  username: string;
}
