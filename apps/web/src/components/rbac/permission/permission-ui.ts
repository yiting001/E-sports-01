import { PermissionType } from '@app/contracts';

export const PERMISSION_TYPE_META: Record<
  PermissionType,
  { label: string; tone: 'api' | 'button' | 'menu' }
> = {
  [PermissionType.Api]: { label: '接口', tone: 'api' },
  [PermissionType.Button]: { label: '按钮', tone: 'button' },
  [PermissionType.Menu]: { label: '菜单', tone: 'menu' },
};
