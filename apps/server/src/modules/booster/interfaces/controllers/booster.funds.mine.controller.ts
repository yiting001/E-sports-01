import { Controller, Get } from '@nestjs/common';
import { BoosterFundsView } from '@app/contracts';
import { GetMyBoosterFundsUseCase } from '../../application/use-cases/get-my-booster-funds.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';

/**
 * 路由：获取当前打手「我的资金」聚合视图（GET /booster/funds/mine）。
 * 仅登录态；只返回本人押金/余额/冻结/结算/罚款汇总，只读无写入。
 */
@Controller('booster')
export class BoosterFundsMineController {
  constructor(private readonly useCase: GetMyBoosterFundsUseCase) {}

  @Get('funds/mine')
  mine(@CurrentUser() user: AuthUser): Promise<BoosterFundsView> {
    return this.useCase.execute(user.id);
  }
}
