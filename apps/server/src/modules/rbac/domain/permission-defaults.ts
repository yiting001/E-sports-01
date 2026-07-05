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
  [PERMS.realname.list]: '实名-审核列表',
  [PERMS.realname.review]: '实名-审核',
  [PERMS.realname.policy]: '实名-策略配置',
  [PERMS.feedback.list]: '反馈-查询',
  [PERMS.feedback.handle]: '反馈-处理',
  [PERMS.order.list]: '订单-查询',
  [PERMS.order.detail]: '订单-详情',
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
