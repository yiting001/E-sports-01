import { PermissionType } from '@app/contracts';
import { PERMS } from './permission-codes';

/** 播种用的 api 权限定义形状 */
export interface PermissionDefault {
  code: string;
  name: string;
  type: PermissionType;
}

/** 权限码 → 中文名映射，集中维护，避免散落 */
const PERMISSION_NAMES: Record<string, string> = {
  [PERMS.tenant.list]: '租户-查询',
  [PERMS.tenant.create]: '租户-创建',
  [PERMS.tenant.update]: '租户-更新',
  [PERMS.tenant.remove]: '租户-删除',
  [PERMS.config.list]: '配置-查询',
  [PERMS.config.save]: '配置-保存',
  [PERMS.config.remove]: '配置-删除',
  [PERMS.user.list]: '用户-查询',
  [PERMS.user.create]: '用户-创建',
  [PERMS.user.update]: '用户-更新',
  [PERMS.user.remove]: '用户-删除',
  [PERMS.user.assignRoles]: '用户-分配角色',
  [PERMS.role.list]: '角色-查询',
  [PERMS.role.create]: '角色-创建',
  [PERMS.role.update]: '角色-更新',
  [PERMS.role.remove]: '角色-删除',
  [PERMS.role.assignPermissions]: '角色-分配权限',
  [PERMS.permission.list]: '权限-查询',
  [PERMS.permission.create]: '权限-创建',
  [PERMS.permission.update]: '权限-更新',
  [PERMS.permission.remove]: '权限-删除',
  [PERMS.file.upload]: '文件-上传',
  [PERMS.file.list]: '文件-查询',
  [PERMS.file.remove]: '文件-删除',
  [PERMS.im.history]: '消息-历史',
  [PERMS.im.conversationCreate]: '会话-建群',
  [PERMS.im.conversationManage]: '会话-成员管理',
  [PERMS.im.serviceAgent]: '客服-坐席',
  [PERMS.log.list]: '日志-查询',
  [PERMS.log.detail]: '日志-链路详情',
  [PERMS.log.purge]: '日志-清理',
  [PERMS.wallet.list]: '钱包-用户列表',
  [PERMS.wallet.transaction]: '钱包-明细查看',
  [PERMS.wallet.adjust]: '钱包-余额调整',
  [PERMS.finance.withdrawalList]: '财务-提现工单列表',
  [PERMS.finance.withdrawalReview]: '财务-提现审核',
  [PERMS.finance.penaltyList]: '财务-罚款记录查看',
  [PERMS.finance.penaltyCreate]: '财务-打手罚款',
  [PERMS.realname.list]: '实名-审核列表',
  [PERMS.realname.review]: '实名-审核',
  [PERMS.realname.policy]: '实名-策略配置',
  [PERMS.feedback.list]: '反馈-查询',
  [PERMS.feedback.handle]: '反馈-处理',
  [PERMS.booster.list]: '打手-查询',
  [PERMS.booster.review]: '打手-入驻审核',
  [PERMS.booster.update]: '打手-资料编辑',
  [PERMS.booster.levelSet]: '打手-等级档位配置',
  [PERMS.booster.depositRefund]: '打手-押金退还',
  [PERMS.booster.depositPolicySet]: '打手-押金交付配置',
  [PERMS.member.levelSet]: '会员-等级档位配置',
  [PERMS.dashboard.orders]: '仪表盘-订单统计',
  [PERMS.dashboard.finance]: '仪表盘-财务统计',
  [PERMS.dashboard.users]: '仪表盘-用户统计',
  [PERMS.dashboard.boosters]: '仪表盘-打手统计',
  [PERMS.order.list]: '订单-查询',
  [PERMS.order.detail]: '订单-详情',
  [PERMS.order.dispatch]: '订单-下发大厅',
  [PERMS.order.assign]: '订单-指派打手',
  [PERMS.review.list]: '评论-查询',
  [PERMS.review.moderate]: '评论-显隐',
  [PERMS.review.remove]: '评论-删除',
  [PERMS.coupon.list]: '优惠券-查询',
  [PERMS.coupon.save]: '优惠券-新建/编辑',
  [PERMS.coupon.remove]: '优惠券-删除',
  [PERMS.invite.configSet]: '邀请-奖励配置',
  [PERMS.invite.recordList]: '邀请-记录查询',
  [PERMS.activity.list]: '活动-查询',
  [PERMS.activity.save]: '活动-新建/编辑',
  [PERMS.activity.remove]: '活动-删除',
  [PERMS.notice.list]: '通知-查询',
  [PERMS.notice.save]: '通知-新建/编辑',
  [PERMS.notice.remove]: '通知-删除',
  [PERMS.notice.banner]: '通知-首页横幅设置',
  [PERMS.category.list]: '分类-查询',
  [PERMS.category.create]: '分类-创建',
  [PERMS.category.update]: '分类-更新',
  [PERMS.category.remove]: '分类-删除',
  [PERMS.product.list]: '商品-查询',
  [PERMS.product.create]: '商品-创建',
  [PERMS.product.update]: '商品-更新',
  [PERMS.product.remove]: '商品-删除',
  [PERMS.product.publish]: '商品-上下架',
};

/**
 * 由权限码常量生成默认 api 权限清单。
 * 与控制器 @Permissions 引用同一份 PERMS，保证库内权限与代码一致。
 */
export const DEFAULT_PERMISSIONS: PermissionDefault[] = Object.values(PERMS)
  .flatMap((group) => Object.values(group))
  .map((code) => ({
    code,
    name: PERMISSION_NAMES[code] ?? code,
    type: PermissionType.Api,
  }));
