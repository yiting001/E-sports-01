import {
  TENANT_ADMIN_PASSWORD_MAX_LENGTH,
  TENANT_ADMIN_PASSWORD_MIN_LENGTH,
  TENANT_ADMIN_PASSWORD_PATTERN,
} from '@app/contracts';

export const TENANT_ADMIN_PASSWORD_HINT =
  '管理员密码须为 12-128 位，并包含大小写字母、数字和特殊字符';

/** 返回租户管理员初始密码的校验错误；null 表示可提交。 */
export function tenantAdminPasswordError(value: string): string | null {
  const password = value;
  if (
    password.length < TENANT_ADMIN_PASSWORD_MIN_LENGTH ||
    password.length > TENANT_ADMIN_PASSWORD_MAX_LENGTH ||
    !TENANT_ADMIN_PASSWORD_PATTERN.test(password)
  ) {
    return TENANT_ADMIN_PASSWORD_HINT;
  }
  return null;
}
