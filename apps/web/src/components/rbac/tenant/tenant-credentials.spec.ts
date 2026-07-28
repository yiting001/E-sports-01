import { describe, expect, it } from 'vitest';
import { tenantAdminPasswordError } from './tenant-credentials';

describe('租户管理员初始密码', () => {
  it('拒绝空值和公共弱密码，只接受独立强密码', () => {
    expect(tenantAdminPasswordError('')).not.toBeNull();
    expect(tenantAdminPasswordError('admin123456')).not.toBeNull();
    expect(tenantAdminPasswordError(' Tenant-A#2026 ')).not.toBeNull();
    expect(tenantAdminPasswordError('Tenant-A#2026')).toBeNull();
  });
});
