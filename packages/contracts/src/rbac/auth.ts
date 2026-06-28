/** 登录入参 */
export interface LoginPayload {
  /** 登录账号：用户名或已绑定的手机号 */
  account: string;
  password: string;
  /** 租户编码（选填）：多租户下用于消解同名歧义，空表示按平台/默认租户解析 */
  tenantCode?: string;
}

/** 注册入参 */
export interface RegisterPayload {
  username: string;
  password: string;
  nickname?: string;
  /** 绑定手机号（选填），绑定后可用短信验证码登录 */
  phone?: string;
  /** 注册到的租户编码（选填），空表示注册到默认租户 */
  tenantCode?: string;
}

/** 当前登录用户自助更新资料入参（仅本人可改的字段，均可选按需更新） */
export interface UpdateProfilePayload {
  /** 昵称 */
  nickname?: string;
  /** 头像 URL（先经自助上传得到） */
  avatar?: string;
  /** 绑定手机号；传空串解绑，传非空须为合法手机号 */
  phone?: string;
}

/** 登录/刷新返回的令牌对 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** accessToken 过期秒数 */
  expiresIn: number;
}

/** 当前登录用户的概要信息（含权限码与菜单） */
export interface AuthProfile {
  id: string;
  username: string;
  nickname: string;
  /** 头像可访问 URL；未设置为空串 */
  avatar: string;
  /** 绑定手机号；未绑定为空串 */
  phone: string;
  roles: string[];
  /** 扁平化权限码集合，前端按钮级鉴权使用 */
  permissions: string[];
  /** 是否超级管理员：为真时拥有全部权限，前端鉴权直接放行 */
  isSuper: boolean;
  /** 所属租户编码 */
  tenantCode: string;
  /** 所属租户名称 */
  tenantName: string;
}
