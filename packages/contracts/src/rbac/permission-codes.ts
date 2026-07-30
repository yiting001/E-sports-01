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
    assign: 'order:admin:assign',
  },
  review: {
    list: 'review:admin:list',
    moderate: 'review:admin:moderate',
    remove: 'review:admin:remove',
    /** 营销工具：管理端添加自定义评论 */
    marketing: 'review:admin:marketing',
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
  coupon: {
    /** 优惠券列表查看（管理端） */
    list: 'coupon:list',
    /** 优惠券新建/编辑/启停 */
    save: 'coupon:save',
    /** 优惠券删除 */
    remove: 'coupon:remove',
  },
  invite: {
    /** 邀请奖励配置读写（管理端） */
    configSet: 'invite:config:set',
    /** 邀请记录查询（管理端） */
    recordList: 'invite:record:list',
  },
  activity: {
    /** 福利活动列表查看（管理端） */
    list: 'activity:list',
    /** 活动新建/编辑/启停 */
    save: 'activity:save',
    /** 活动删除 */
    remove: 'activity:remove',
  },
  notice: {
    list: 'notice:list',
    save: 'notice:save',
    remove: 'notice:remove',
    banner: 'notice:banner',
  },
  theme: {
    /** 主题特效配置查看 */
    list: 'theme:effects:list',
    /** 主题特效配置保存 */
    save: 'theme:effects:save',
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
