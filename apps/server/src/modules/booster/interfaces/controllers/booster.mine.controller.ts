import { Controller, Get } from '@nestjs/common';
import { BoosterMineView } from '@app/contracts';
import { GetMyBoosterUseCase } from '../../application/use-cases/get-my-booster.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';

/**
 * 路由：获取当前用户打手入驻概览（GET /booster/mine）。
 * 仅登录态，所有角色可用；返回当前申请状态与记录。
 */
@Controller('booster')
export class BoosterMineController {
  constructor(private readonly useCase: GetMyBoosterUseCase) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser): Promise<BoosterMineView> {
    return this.useCase.execute(user.id);
  }
}
