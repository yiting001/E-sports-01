/** 用户状态 */
export enum UserStatusEnum {
  Enabled = 'enabled',
  Disabled = 'disabled',
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
