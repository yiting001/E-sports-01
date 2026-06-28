import { Body, Controller, Put } from '@nestjs/common';
import { UserView } from '@app/contracts';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.usecase';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/metadata';
import { UpdateProfileDto } from '../dto/update-profile.dto';

/**
 * 路由：当前登录用户自助更新本人资料（PUT /auth/profile）。
 * 仅登录态，所有角色通用；改 昵称/头像/手机号。
 */
@Controller('auth')
export class AuthUpdateProfileController {
  constructor(private readonly useCase: UpdateProfileUseCase) {}

  @Put('profile')
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserView> {
    return this.useCase.execute(user.id, dto);
  }
}
