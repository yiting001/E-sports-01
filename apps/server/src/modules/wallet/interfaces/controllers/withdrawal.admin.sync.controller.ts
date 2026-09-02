import { Controller, Param, Post } from '@nestjs/common';
import { WithdrawalResultView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { SyncWithdrawalUseCase } from '../../application/use-cases/sync-withdrawal.usecase';

/**
 * 路由：主动向渠道查询处理中提现单的转账结果并推进状态
 * （POST /wallet/admin/withdrawals/:id/sync）。需 finance:withdrawal:review 权限。
 */
@Controller('wallet/admin')
export class WithdrawalAdminSyncController {
  constructor(private readonly useCase: SyncWithdrawalUseCase) {}

  @Post('withdrawals/:id/sync')
  @Permissions(PERMS.finance.withdrawalReview)
  sync(@Param('id') id: string): Promise<WithdrawalResultView> {
    return this.useCase.execute(id);
  }
}
