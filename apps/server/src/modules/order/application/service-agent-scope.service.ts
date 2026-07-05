import { ForbiddenException, Injectable } from '@nestjs/common';
import { RoleGranter } from '../../rbac/application/role-granter.service';
import {
  SERVICE_ROLE,
  SUPER_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
} from '../../rbac/domain/rbac.constants';
import { OrderEntity } from '../domain/order.entity';

/**
 * 客服订单可见范围解析。
 * 「客服」角色（且非管理员）在管理端只能看到/处理自己负责商品的订单：
 * 列表强制按 serviceAgentId 过滤，详情/下发/指派前断言归属。
 * 管理员（超管/租户管理员）不受限。
 */
@Injectable()
export class ServiceAgentScope {
  constructor(private readonly roleGranter: RoleGranter) {}

  /** 解析强制过滤的客服 id：客服角色返回自身 id，管理员返回 undefined（不限） */
  async resolveAgentId(userId: string): Promise<string | undefined> {
    if (
      (await this.roleGranter.has(userId, SUPER_ADMIN_ROLE)) ||
      (await this.roleGranter.has(userId, TENANT_ADMIN_ROLE))
    ) {
      return undefined;
    }
    if (await this.roleGranter.has(userId, SERVICE_ROLE)) {
      return userId;
    }
    return undefined;
  }

  /** 断言操作者可查看/处理该订单（客服仅限自己负责的订单），否则抛 403 */
  async assertCanHandle(userId: string, order: OrderEntity): Promise<void> {
    const agentId = await this.resolveAgentId(userId);
    if (agentId && order.serviceAgentId !== agentId) {
      throw new ForbiddenException('仅可处理自己负责商品的订单');
    }
  }
}
