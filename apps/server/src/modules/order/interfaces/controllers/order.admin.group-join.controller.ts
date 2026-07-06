import { Controller, Param, Post } from '@nestjs/common';
import { OrderGroupJoinResult, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { JoinOrderGroupUseCase } from '../../application/use-cases/join-order-group.usecase';

/**
 * 路由：管理端进入订单群（POST /order/admin/:id/group/join）。
 * 需 order:admin:detail 权限；幂等加入订单群后返回会话 id，供后台打开群聊。
 */
@Controller('order')
export class OrderAdminGroupJoinController {
  constructor(private readonly useCase: JoinOrderGroupUseCase) {}

  @Post('admin/:id/group/join')
  @Permissions(PERMS.order.detail)
  join(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrderGroupJoinResult> {
    return this.useCase.execute(user.id, id);
  }
}
