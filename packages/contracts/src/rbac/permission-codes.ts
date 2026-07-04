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
  wallet: {
    list: 'wallet:admin:list',
    transaction: 'wallet:admin:transaction',
    adjust: 'wallet:admin:adjust',
  },
  realname: {
    list: 'realname:list',
    review: 'realname:review',
    policy: 'realname:policy',
  },
  feedback: {
    list: 'feedback:list',
    handle: 'feedback:handle',
  },
  notice: {
    list: 'notice:list',
    save: 'notice:save',
    remove: 'notice:remove',
    banner: 'notice:banner',
  },
  category: {
    list: 'commerce:category:list',
    create: 'commerce:category:create',
    update: 'commerce:category:update',
    remove: 'commerce:category:remove',
  },
  product: {
    list: 'commerce:product:list',
    create: 'commerce:product:create',
    update: 'commerce:product:update',
    remove: 'commerce:product:remove',
    publish: 'commerce:product:publish',
  },
} as const;
