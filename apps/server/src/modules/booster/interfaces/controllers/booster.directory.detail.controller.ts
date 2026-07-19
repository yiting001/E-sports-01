import { BoosterPublicView } from '@app/contracts';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GetBoosterPublicProfileUseCase } from '../../application/use-cases/get-booster-public-profile.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';

/** 登录用户查看同租户打手的脱敏公开主页。 */
@Controller('booster')
export class BoosterDirectoryDetailController {
  constructor(private readonly useCase: GetBoosterPublicProfileUseCase) {}

  @Get('directory/:userId')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<BoosterPublicView> {
    return this.useCase.execute(user.id, userId);
  }
}
