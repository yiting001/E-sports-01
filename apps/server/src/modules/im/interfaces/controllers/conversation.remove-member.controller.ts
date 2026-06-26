import { Controller, Delete, HttpCode, Param } from '@nestjs/common';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { RemoveMemberUseCase } from '../../application/use-cases/remove-member.usecase';

/** 路由：从群聊移除成员 */
@Controller('im/conversations')
export class ConversationRemoveMemberController {
  constructor(private readonly useCase: RemoveMemberUseCase) {}

  @Delete(':id/members/:userId')
  @HttpCode(204)
  @Permissions(PERMS.im.conversationManage)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.useCase.execute(id, user.id, userId);
  }
}
