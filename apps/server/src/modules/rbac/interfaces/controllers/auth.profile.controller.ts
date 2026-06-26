import { Controller, Get } from '@nestjs/common';
import { AuthProfile } from '@app/contracts';
import { GetProfileUseCase } from '../../application/use-cases/get-profile.usecase';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/metadata';

/** 路由：获取当前登录用户的概要（角色、权限码） */
@Controller('auth')
export class AuthProfileController {
  constructor(private readonly useCase: GetProfileUseCase) {}

  @Get('profile')
  profile(@CurrentUser() user: AuthUser): Promise<AuthProfile> {
    return this.useCase.execute(user.id);
  }
}
