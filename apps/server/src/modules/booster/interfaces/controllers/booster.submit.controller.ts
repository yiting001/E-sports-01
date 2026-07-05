import { Body, Controller, Post } from '@nestjs/common';
import { BoosterView } from '@app/contracts';
import { SubmitBoosterUseCase } from '../../application/use-cases/submit-booster.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { SubmitBoosterDto } from '../dto/submit-booster.dto';

/**
 * 路由：提交/重提打手入驻申请（POST /booster）。
 * 仅登录态，所有角色可用；提交后进入待审核。
 */
@Controller('booster')
export class BoosterSubmitController {
  constructor(private readonly useCase: SubmitBoosterUseCase) {}

  @Post()
  submit(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitBoosterDto,
  ): Promise<BoosterView> {
    return this.useCase.execute(user.id, dto);
  }
}
