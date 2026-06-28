import { Body, Controller, Post } from '@nestjs/common';
import { RealnameView } from '@app/contracts';
import { SubmitRealnameUseCase } from '../../application/use-cases/submit-realname.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { SubmitRealnameDto } from '../dto/submit-realname.dto';

/**
 * 路由：提交/重提实名认证（POST /realname）。
 * 仅登录态，所有角色可用；提交后进入待审核。
 */
@Controller('realname')
export class RealnameSubmitController {
  constructor(private readonly useCase: SubmitRealnameUseCase) {}

  @Post()
  submit(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitRealnameDto,
  ): Promise<RealnameView> {
    return this.useCase.execute(user.id, dto);
  }
}
