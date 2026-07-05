import { Controller, Get } from '@nestjs/common';
import { MemberMineView } from '@app/contracts';
import { GetMyMemberUseCase } from '../../application/use-cases/get-my-member.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';

/** 路由：获取我的会员概览（GET /member/mine），仅登录态 */
@Controller('member')
export class MemberMineController {
  constructor(private readonly useCase: GetMyMemberUseCase) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser): Promise<MemberMineView> {
    return this.useCase.execute(user.id);
  }
}
