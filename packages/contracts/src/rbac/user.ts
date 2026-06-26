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
  status: UserStatusEnum;
  roles: UserRoleBrief[];
  createdAt: string;
}
