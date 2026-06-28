import type { TenantStatus } from '@app/contracts';

export interface EditTenantForm {
  id: string;
  name: string;
  status: TenantStatus;
  remark: string;
  builtin: boolean;
}
