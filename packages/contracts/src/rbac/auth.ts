/** 登录入参 */
export interface LoginPayload {
  username: string;
  password: string;
}

/** 注册入参 */
export interface RegisterPayload {
  username: string;
  password: string;
  nickname?: string;
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
  roles: string[];
  /** 扁平化权限码集合，前端按钮级鉴权使用 */
  permissions: string[];
  /** 是否超级管理员：为真时拥有全部权限，前端鉴权直接放行 */
  isSuper: boolean;
}
