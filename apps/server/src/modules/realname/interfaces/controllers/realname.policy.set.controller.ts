import { Body, Controller, Put } from '@nestjs/common';
import { PERMS, RealnamePolicyView } from '@app/contracts';
import { SetRealnamePolicyUseCase } from '../../application/use-cases/set-policy.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { SetRealnamePolicyDto } from '../dto/set-policy.dto';

/**
 * 路由：设置实名策略（PUT /realname/policy）。
 * 需 realname:policy 权限；覆盖写入需实名的角色集合。
 */
@Controller('realname')
export class RealnamePolicySetController {
  constructor(private readonly useCase: SetRealnamePolicyUseCase) {}

  @Put('policy')
  @Permissions(PERMS.realname.policy)
  set(@Body() dto: SetRealnamePolicyDto): Promise<RealnamePolicyView> {
    return this.useCase.execute(dto);
  }
}
