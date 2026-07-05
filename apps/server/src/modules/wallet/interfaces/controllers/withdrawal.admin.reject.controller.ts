import { Body, Controller, Param, Post } from '@nestjs/common';
import { WithdrawalResultView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { RejectWithdrawalUseCase } from '../../application/use-cases/reject-withdrawal.usecase';
import { RejectWithdrawalDto } from '../dto/reject-withdrawal.dto';

/**
 * 路由：驳回提现并退回余额（POST /wallet/admin/withdrawals/:id/reject）。
 * 需 finance:withdrawal:review 权限。
 */
@Controller('wallet/admin')
export class WithdrawalAdminRejectController {
  constructor(private readonly useCase: RejectWithdrawalUseCase) {}

  @Post('withdrawals/:id/reject')
  @Permissions(PERMS.finance.withdrawalReview)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectWithdrawalDto,
  ): Promise<WithdrawalResultView> {
    return this.useCase.execute(id, dto.reason);
  }
}
