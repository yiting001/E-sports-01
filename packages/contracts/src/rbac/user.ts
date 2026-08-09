/** 用户状态 */
export enum UserStatusEnum {
  Enabled = "enabled",
  Disabled = "disabled",
}

const PUBLIC_DISPLAY_NAME_ID_SUFFIX_LENGTH = 6;
const SENSITIVE_PHONE_DISPLAY_PATTERN =
  /(?:sms_)?1[3-9]\d{9}(?:_[0-9a-f]{4})?/i;

/** 对外安全展示名：只使用安全昵称，否则回退稳定用户编号。 */
export function formatPublicUserDisplayName(
  userId: string,
  nickname: string
): string {
  const normalizedNickname = nickname.trim();
  if (
    normalizedNickname &&
    !SENSITIVE_PHONE_DISPLAY_PATTERN.test(normalizedNickname)
  ) {
    return normalizedNickname;
  }
  const suffix = userId
    .replace(/-/g, "")
    .slice(-PUBLIC_DISPLAY_NAME_ID_SUFFIX_LENGTH)
    .toUpperCase();
  return suffix ? `用户${suffix}` : "用户";
}

/** 用户所属角色的精简视图 */
export interface UserRoleBrief {
  id: string;
  code: string;
  name: string;
}

/** 用户对外视图（不含密码） */
export interface UserView {
  id: string;
  username: string;
  nickname: string;
  /** 头像可访问 URL；未设置为空串 */
  avatar: string;
  /** 绑定手机号，用于短信验证码登录；未绑定为空串 */
  phone: string;
  status: UserStatusEnum;
  roles: UserRoleBrief[];
  /** 所属租户编码（平台超管查看跨租户列表时区分归属） */
  tenantCode: string;
  createdAt: string;
}

/** 用户列表筛选条件 */
export interface UserListQuery {
  keyword?: string;
  status?: UserStatusEnum;
  roleId?: string;
}
