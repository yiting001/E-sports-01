import { Controller, Param, Post } from '@nestjs/common';
import { WithdrawalResultView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { ApproveWithdrawalUseCase } from '../../application/use-cases/approve-withdrawal.usecase';

/**
 * 路由：审核通过提现并按执行渠道发起转账（POST /wallet/admin/withdrawals/:id/approve）。
 * 需 finance:withdrawal:review 权限。
 */
@Controller('wallet/admin')
export class WithdrawalAdminApproveController {
  constructor(private readonly useCase: ApproveWithdrawalUseCase) {}

  @Post('withdrawals/:id/approve')
  @Permissions(PERMS.finance.withdrawalReview)
  approve(@Param('id') id: string): Promise<WithdrawalResultView> {
    return this.useCase.execute(id);
  }
}
