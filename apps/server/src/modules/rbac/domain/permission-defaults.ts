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
