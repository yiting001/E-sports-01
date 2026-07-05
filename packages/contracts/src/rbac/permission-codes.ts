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
  booster: {
    list: 'booster:list',
    review: 'booster:review',
    update: 'booster:update',
    /** 等级档位配置（提成费率） */
    levelSet: 'booster:level:set',
    /** 押金退还 */
    depositRefund: 'booster:deposit:refund',
    /** 押金交付策略配置（最低/最高交付额） */
    depositPolicySet: 'booster:deposit:policy:set',
  },
  member: {
    /** 会员等级档位配置（消费折扣） */
    levelSet: 'member:level:set',
  },
  order: {
    list: 'order:admin:list',
    detail: 'order:admin:detail',
    dispatch: 'order:admin:dispatch',
  },
  review: {
    list: 'review:admin:list',
    moderate: 'review:admin:moderate',
    remove: 'review:admin:remove',
  },
  finance: {
    /** 提现工单列表查看 */
    withdrawalList: 'finance:withdrawal:list',
    /** 提现审核（通过/驳回） */
    withdrawalReview: 'finance:withdrawal:review',
    /** 罚款记录查看 */
    penaltyList: 'finance:penalty:list',
    /** 对打手创建罚款 */
    penaltyCreate: 'finance:penalty:create',
  },
  dashboard: {
    /** 仪表盘-订单运营统计 */
    orders: 'dashboard:orders',
    /** 仪表盘-财务资金统计 */
    finance: 'dashboard:finance',
    /** 仪表盘-用户增长统计 */
    users: 'dashboard:users',
    /** 仪表盘-打手生态统计 */
    boosters: 'dashboard:boosters',
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
