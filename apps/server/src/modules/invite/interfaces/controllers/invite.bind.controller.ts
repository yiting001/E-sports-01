import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { BindInviteUseCase } from '../../application/use-cases/bind-invite.usecase';
import { BindInviteDto } from '../dto/bind-invite.dto';

/** 路由：填码绑定邀请关系（POST /invite/bind）；仅登录态，绑定成功即发放奖励 */
@Controller('invite')
export class InviteBindController {
  constructor(private readonly useCase: BindInviteUseCase) {}

  @Post('bind')
  bind(@CurrentUser() user: AuthUser, @Body() dto: BindInviteDto): Promise<void> {
    return this.useCase.execute(user.id, dto.code);
  }
}
