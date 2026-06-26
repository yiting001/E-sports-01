/**
 * 后端接口级权限码登记处。
 * 控制器用 @Permissions 引用这些常量，RBAC 播种器据此生成 api 类型权限，
 * 二者共用同一份常量，避免“代码里的码”与“库里的码”不一致。
 */
export const PERMS = {
  config: {
    list: 'config:list',
    save: 'config:save',
    remove: 'config:remove',
  },
  user: {
    list: 'rbac:user:list',
    create: 'rbac:user:create',
    update: 'rbac:user:update',
    remove: 'rbac:user:remove',
    assignRoles: 'rbac:user:assignRoles',
  },
  role: {
    list: 'rbac:role:list',
    create: 'rbac:role:create',
    update: 'rbac:role:update',
    remove: 'rbac:role:remove',
    assignPermissions: 'rbac:role:assignPermissions',
  },
  permission: {
    list: 'rbac:permission:list',
    create: 'rbac:permission:create',
    update: 'rbac:permission:update',
    remove: 'rbac:permission:remove',
  },
} as const;
