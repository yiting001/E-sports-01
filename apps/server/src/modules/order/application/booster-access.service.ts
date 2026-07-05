import { ForbiddenException, Injectable } from '@nestjs/common';
import { BOOSTER_ROLE_CODE } from '@app/contracts';
import { RoleGranter } from '../../rbac/application/role-granter.service';

/**
 * 打手访问断言：接单大厅/打手订单等接口仅限拥有 booster 角色的用户访问。
 * 复用 RBAC 模块的 RoleGranter 只读能力，不直接触碰 RBAC 仓储。
 */
@Injectable()
export class BoosterAccess {
  constructor(private readonly roleGranter: RoleGranter) {}

  /** 断言用户拥有打手角色，否则抛 403 */
  async assert(userId: string): Promise<void> {
    if (!(await this.roleGranter.has(userId, BOOSTER_ROLE_CODE))) {
      throw new ForbiddenException('仅打手可访问，请先完成打手入驻');
    }
  }
}
