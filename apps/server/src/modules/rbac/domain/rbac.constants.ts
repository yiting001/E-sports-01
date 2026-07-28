import { BOOSTER_ROLE_CODE, PERMS } from '@app/contracts';

/**
 * 超级管理员角色码。
 * 拥有该角色的用户跳过权限校验（拥有全部权限）。
 */
export const SUPER_ADMIN_ROLE = 'admin';

/**
 * 租户管理员角色码（每个租户内置一份）。
 * 拥有本租户业务权限，但不含平台目录与全局规则写权限。
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

/** 仅由系统播种或领域流程维护，不能通过通用角色接口创建的内置角色。 */
export const RESERVED_ROLE_CODES = [
  SUPER_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MEMBER_ROLE,
  SERVICE_ROLE,
  BOOSTER_ROLE_CODE,
] as const;

export const RESERVED_ROLE_CODE_SET: ReadonlySet<string> = new Set(RESERVED_ROLE_CODES);

function permissionFamilyPrefix(code: string): string {
  return `${code.split(':').slice(0, 2).join(':')}:`;
}

/** 仅平台超级管理员可持有的权限目录。 */
export const PLATFORM_ONLY_PERMISSION_PREFIXES = [
  permissionFamilyPrefix(PERMS.tenant.list),
  permissionFamilyPrefix(PERMS.permission.list),
] as const;

/** 仅平台超管可执行的全局业务规则写权限。 */
export const PLATFORM_ONLY_PERMISSION_CODES = [
  PERMS.member.levelSet,
  PERMS.booster.levelSet,
  PERMS.booster.depositPolicySet,
  PERMS.realname.policy,
  PERMS.invite.configSet,
] as const;

const PLATFORM_ONLY_PERMISSION_CODE_SET: ReadonlySet<string> = new Set(
  PLATFORM_ONLY_PERMISSION_CODES,
);

/** 统一判定权限是否属于平台级，供新建与存量租户角色共用。 */
export function isPlatformOnlyPermission(code: string): boolean {
  return (
    PLATFORM_ONLY_PERMISSION_PREFIXES.some((prefix) => code.startsWith(prefix)) ||
    PLATFORM_ONLY_PERMISSION_CODE_SET.has(code)
  );
}

/**
 * 客服角色默认权限码：管理端「即时通讯 / 客服工作台」菜单 + 消息历史 + 坐席接口，
 * 以及「订单管理」菜单与订单处理接口（列表/详情/下发大厅/指派打手）。
 * 由播种器幂等补齐；客服在订单列表仅能看到自己负责商品的订单（后端强制过滤）。
 */
export const SERVICE_ROLE_PERMISSION_CODES: string[] = [
  'im:menu',
  'im:service:menu',
  PERMS.im.history,
  PERMS.im.serviceAgent,
  'order:admin:menu',
  PERMS.order.list,
  PERMS.order.detail,
  PERMS.order.dispatch,
  PERMS.order.assign,
];
