import { Controller, Get } from '@nestjs/common';
import { WithdrawTaxConfigView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { GetWithdrawTaxConfigUseCase } from '../../application/use-cases/get-withdraw-tax-config.usecase';

/**
 * 路由：财务查看税务配置（GET /wallet/admin/tax-config）。
 * 需 finance:tax:list 权限；返回提现阶梯税费档位与回退单一费率。
 */
@Controller('wallet/admin')
export class TaxConfigAdminGetController {
  constructor(private readonly useCase: GetWithdrawTaxConfigUseCase) {}

  @Get('tax-config')
  @Permissions(PERMS.finance.taxView)
  get(): Promise<WithdrawTaxConfigView> {
    return this.useCase.execute();
  }
}
