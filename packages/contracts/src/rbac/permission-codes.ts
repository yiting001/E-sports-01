/**
 * 权限码登记处（前后端共享单一来源）。
 * 后端控制器用 @Permissions 引用、播种器据此生成 api 权限；
 * 前端路由 meta 与 v-permission 指令复用同一份常量，避免“码”不一致或硬编码。
 */
export const PERMS = {
  tenant: {
    list: 'rbac:tenant:list',
    create: 'rbac:tenant:create',
    update: 'rbac:tenant:update',
    remove: 'rbac:tenant:remove',
  },
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
  file: {
    upload: 'upload:file:upload',
    list: 'upload:file:list',
    remove: 'upload:file:remove',
  },
  im: {
    history: 'im:message:history',
    conversationCreate: 'im:conversation:create',
    conversationManage: 'im:conversation:manage',
    serviceAgent: 'im:service:agent',
  },
  log: {
    list: 'observability:log:list',
    detail: 'observability:log:detail',
    purge: 'observability:log:purge',
  },
} as const;
