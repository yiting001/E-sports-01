import { Controller, Param, Post } from '@nestjs/common';
import { BoosterView, PERMS } from '@app/contracts';
import { RefundDepositUseCase } from '../../application/use-cases/refund-deposit.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/**
 * 路由：管理端退还打手押金（POST /booster/:id/deposit/refund）。
 * 需 booster:deposit:refund 权限；全额退回打手钱包余额并记流水。
 */
@Controller('booster')
export class BoosterDepositRefundController {
  constructor(private readonly useCase: RefundDepositUseCase) {}

  @Post(':id/deposit/refund')
  @Permissions(PERMS.booster.depositRefund)
  refund(@Param('id') id: string): Promise<BoosterView> {
    return this.useCase.execute(id);
  }
}
