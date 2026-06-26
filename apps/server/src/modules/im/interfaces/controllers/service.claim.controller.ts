import { Controller, Param, Post } from '@nestjs/common';
import { ConversationView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { ClaimServiceUseCase } from '../../application/use-cases/claim-service.usecase';

/** 路由：坐席认领客服会话 */
@Controller('im/service')
export class ServiceClaimController {
  constructor(private readonly useCase: ClaimServiceUseCase) {}

  @Post(':id/claim')
  @Permissions(PERMS.im.serviceAgent)
  claim(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ConversationView> {
    return this.useCase.execute(id, user.id);
  }
}
