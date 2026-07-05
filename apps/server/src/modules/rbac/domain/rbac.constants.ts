import { PERMS } from '@app/contracts';

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

/**
 * 普通用户（会员）角色码。
 * 短信注册的自助用户默认分配该角色，仅有登录后可见的基础能力，无任何管理权限。
 */
export const MEMBER_ROLE = 'member';

/**
 * 客服角色码。
 * 管理员在用户管理中为客服人员分配该角色；创建商品时「关联负责客服」的候选列表仅取该角色用户。
 */
export const SERVICE_ROLE = 'service';

/**
 * 客服角色默认权限码：管理端「即时通讯 / 客服工作台」菜单 + 消息历史 + 坐席接口。
 * 由播种器幂等补齐，使客服账号登录管理端即可接待访客。
 * 订单管理暂为管理员权限；「客服仅见自己负责的订单」在后续客服处理迭代中实现。
 */
export const SERVICE_ROLE_PERMISSION_CODES: string[] = [
  'im:menu',
  'im:service:menu',
  PERMS.im.history,
  PERMS.im.serviceAgent,
];
