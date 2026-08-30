import type { UserStatusEnum } from '@app/contracts';

export interface EditUserForm {
  id: string;
  username: string;
  nickname: string;
  phone: string;
  status: UserStatusEnum;
  roleIds: string[];
  /** 所属租户主键；仅平台超管可变更 */
  tenantId: string;
}

export interface UserFiltersForm {
  keyword: string;
  status: UserStatusEnum | '';
  roleId: string;
}

export interface ResetUserPasswordForm {
  id: string;
  username: string;
  nickname: string;
  password: string;
  confirmPassword: string;
}
