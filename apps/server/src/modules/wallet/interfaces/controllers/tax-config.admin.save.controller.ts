import { Body, Controller, Put } from '@nestjs/common';
import { WithdrawTaxConfigView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { PlatformOnly } from '../../../rbac/interfaces/auth/platform-only.decorator';
import { SaveWithdrawTaxConfigUseCase } from '../../application/use-cases/save-withdraw-tax-config.usecase';
import { SaveWithdrawTaxConfigDto } from '../dto/save-withdraw-tax-config.dto';

/**
 * 路由：财务保存税务配置（PUT /wallet/admin/tax-config）。
 * 仅平台超级管理员且需 finance:tax:save 权限；档位写入配置中心，立即对提现计费生效。
 */
@Controller('wallet/admin')
@PlatformOnly()
export class TaxConfigAdminSaveController {
  constructor(private readonly useCase: SaveWithdrawTaxConfigUseCase) {}

  @Put('tax-config')
  @Permissions(PERMS.finance.taxSave)
  save(@Body() dto: SaveWithdrawTaxConfigDto): Promise<WithdrawTaxConfigView> {
    return this.useCase.execute(dto.tiers);
  }
}
