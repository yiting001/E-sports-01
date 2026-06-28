import { Controller, Get } from '@nestjs/common';
import { PERMS, RealnamePolicyView } from '@app/contracts';
import { GetRealnamePolicyUseCase } from '../../application/use-cases/get-policy.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/**
 * 路由：读取实名策略（GET /realname/policy）。
 * 需 realname:policy 权限。
 */
@Controller('realname')
export class RealnamePolicyGetController {
  constructor(private readonly useCase: GetRealnamePolicyUseCase) {}

  @Get('policy')
  @Permissions(PERMS.realname.policy)
  get(): Promise<RealnamePolicyView> {
    return this.useCase.execute();
  }
}
