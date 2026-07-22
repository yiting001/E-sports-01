import assert from 'node:assert/strict';
import test from 'node:test';
import { PERMS } from '@app/contracts';
import type { RoleGranter } from '../../src/modules/rbac/application/role-granter.service';
import { DEFAULT_PERMISSIONS } from '../../src/modules/rbac/domain/permission-defaults';
import {
  SERVICE_ROLE,
  SERVICE_ROLE_PERMISSION_CODES,
  TENANT_ADMIN_ROLE,
} from '../../src/modules/rbac/domain/rbac.constants';
import { AUTH_METADATA } from '../../src/modules/rbac/interfaces/auth/metadata';
import { ServiceAgentScope } from '../../src/modules/order/application/service-agent-scope.service';
import { OrderAdminRefundApproveController } from '../../src/modules/order/interfaces/controllers/order.admin.refund.approve.controller';
import { OrderAdminRefundRejectController } from '../../src/modules/order/interfaces/controllers/order.admin.refund.reject.controller';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';

test('退款审核权限已播种但不默认授予客服', () => {
  assert.equal(
    DEFAULT_PERMISSIONS.some((permission) => permission.code === PERMS.order.refundReview),
    true,
  );
  assert.equal(SERVICE_ROLE_PERMISSION_CODES.includes(PERMS.order.refundReview), false);
});

test('退款通过和驳回接口都声明独立审核权限', () => {
  const approvePermissions = Reflect.getMetadata(
    AUTH_METADATA.permissions,
    OrderAdminRefundApproveController.prototype.approve,
  ) as unknown;
  const rejectPermissions = Reflect.getMetadata(
    AUTH_METADATA.permissions,
    OrderAdminRefundRejectController.prototype.reject,
  ) as unknown;

  assert.deepEqual(approvePermissions, [PERMS.order.refundReview]);
  assert.deepEqual(rejectPermissions, [PERMS.order.refundReview]);
});

test('已授权客服仍只能审核自己负责商品的订单，租户管理员不受该范围限制', async () => {
  const order = Object.assign(new OrderEntity(), { serviceAgentId: 'agent-owner' });
  const serviceRoles = {
    has: async (userId: string, role: string) => userId === 'agent-other' && role === SERVICE_ROLE,
  } as unknown as RoleGranter;
  const serviceScope = new ServiceAgentScope(serviceRoles);
  await assert.rejects(
    serviceScope.assertCanHandle('agent-other', order),
    /仅可处理自己负责商品的订单/,
  );

  const adminRoles = {
    has: async (_userId: string, role: string) => role === TENANT_ADMIN_ROLE,
  } as unknown as RoleGranter;
  const adminScope = new ServiceAgentScope(adminRoles);
  await assert.doesNotReject(adminScope.assertCanHandle('tenant-admin', order));
});
