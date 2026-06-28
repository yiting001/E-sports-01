import { Controller, Get } from '@nestjs/common';
import { RealnameMineView } from '@app/contracts';
import { GetMyRealnameUseCase } from '../../application/use-cases/get-my-realname.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';

/**
 * 路由：获取当前用户实名认证概览（GET /realname/mine）。
 * 仅登录态，所有角色可用；返回是否需实名与当前记录状态。
 */
@Controller('realname')
export class RealnameMineController {
  constructor(private readonly useCase: GetMyRealnameUseCase) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser): Promise<RealnameMineView> {
    return this.useCase.execute(user.id);
  }
}
