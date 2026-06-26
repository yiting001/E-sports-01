import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CloseServiceUseCase } from '../../application/use-cases/close-service.usecase';

/** 路由：结束客服会话 */
@Controller('im/service')
export class ServiceCloseController {
  constructor(private readonly useCase: CloseServiceUseCase) {}

  @Post(':id/close')
  @HttpCode(204)
  @Permissions(PERMS.im.serviceAgent)
  close(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.useCase.execute(id, user.id);
  }
}
