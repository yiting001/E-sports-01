import type { UserStatusEnum } from '@app/contracts';

export interface EditUserForm {
  id: string;
  username: string;
  nickname: string;
  phone: string;
  status: UserStatusEnum;
  roleIds: string[];
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
