/** 路由元数据键，集中定义避免散落的魔法字符串 */
export const AUTH_METADATA = {
  /** 标记公开路由，跳过 JWT 鉴权 */
  isPublic: 'auth:isPublic',
  /** 标记免登录但必须建立租户上下文的业务路由 */
  tenantPublic: 'auth:tenantPublic',
  /** 标记仅默认租户平台超级管理员可访问的目录路由 */
  platformOnly: 'auth:platformOnly',
  /** 标记访问所需的权限码集合 */
  permissions: 'auth:permissions',
} as const;

/** 注入到请求上下文的当前登录用户 */
export interface AuthUser {
  id: string;
  username: string;
}
