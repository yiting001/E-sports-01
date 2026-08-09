import { Body, Controller, Param, Post } from '@nestjs/common';
import { UserView } from '@app/contracts';
import { ResetUserPasswordUseCase } from '../../application/use-cases/reset-user-password.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { ResetUserPasswordDto } from '../dto/reset-user-password.dto';

/** 路由：重置用户登录密码 */
@Controller('rbac/users')
export class UserResetPasswordController {
  constructor(private readonly useCase: ResetUserPasswordUseCase) {}

  @Post(':id/password/reset')
  @Permissions(PERMS.user.update)
  reset(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
  ): Promise<UserView> {
    return this.useCase.execute(id, dto.password);
  }
}
