import { Controller, Get } from '@nestjs/common';
import { WithdrawalTaxExportView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { ExportWithdrawalTaxUseCase } from '../../application/use-cases/export-withdrawal-tax.usecase';

/**
 * 路由：财务一键导出报税表单（GET /wallet/admin/withdrawals/tax-export）。
 * 需 finance:withdrawal:list 权限；导出全部「已到账」提现单的报税 CSV。
 */
@Controller('wallet/admin')
export class WithdrawalAdminExportController {
  constructor(private readonly useCase: ExportWithdrawalTaxUseCase) {}

  @Get('withdrawals/tax-export')
  @Permissions(PERMS.finance.withdrawalList)
  export(): Promise<WithdrawalTaxExportView> {
    return this.useCase.execute();
  }
}
