/**
 * 超级管理员角色码。
 * 拥有该角色的用户跳过权限校验（拥有全部权限）。
 */
export const SUPER_ADMIN_ROLE = 'admin';

/**
 * 租户管理员角色码（每个租户内置一份）。
 * 拥有本租户内全部业务权限，但不含平台级「租户管理」权限，故不能跨租户。
 */
export const TENANT_ADMIN_ROLE = 'tenant_admin';
