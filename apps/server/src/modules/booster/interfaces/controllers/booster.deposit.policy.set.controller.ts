import { Body, Controller, Put } from '@nestjs/common';
import { BoosterDepositPolicy, PERMS } from '@app/contracts';
import { SetDepositPolicyUseCase } from '../../application/use-cases/set-deposit-policy.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { SetDepositPolicyDto } from '../dto/set-deposit-policy.dto';

/**
 * 路由：保存押金交付策略（PUT /booster/deposit/policy）。
 * 需 booster:deposit:policy:set 权限；写入配置中心，立即对缴纳与接单门禁生效。
 */
@Controller('booster')
export class BoosterDepositPolicySetController {
  constructor(private readonly useCase: SetDepositPolicyUseCase) {}

  @Put('deposit/policy')
  @Permissions(PERMS.booster.depositPolicySet)
  save(@Body() dto: SetDepositPolicyDto): Promise<BoosterDepositPolicy> {
    return this.useCase.execute(dto);
  }
}
