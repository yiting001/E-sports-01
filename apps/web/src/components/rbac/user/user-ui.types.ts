import type { UserStatusEnum } from '@app/contracts';

export interface EditUserForm {
  id: string;
  username: string;
  nickname: string;
  phone: string;
  status: UserStatusEnum;
  roleId: string;
}
