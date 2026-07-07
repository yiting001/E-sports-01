import { Controller, Get } from '@nestjs/common';
import { MyInviteView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { GetMyInviteUseCase } from '../../application/use-cases/get-my-invite.usecase';

/** 路由：我的邀请（GET /invite/mine）；仅登录态，返回邀请码/奖励说明/邀请记录 */
@Controller('invite')
export class InviteMineController {
  constructor(private readonly useCase: GetMyInviteUseCase) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser): Promise<MyInviteView> {
    return this.useCase.execute(user.id);
  }
}
