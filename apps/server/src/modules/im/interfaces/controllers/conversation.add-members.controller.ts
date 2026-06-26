import { Body, Controller, Param, Post } from '@nestjs/common';
import { ConversationDetailView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { AddMembersUseCase } from '../../application/use-cases/add-members.usecase';
import { AddMembersDto } from '../dto/add-members.dto';

/** 路由：向群聊添加成员 */
@Controller('im/conversations')
export class ConversationAddMembersController {
  constructor(private readonly useCase: AddMembersUseCase) {}

  @Post(':id/members')
  @Permissions(PERMS.im.conversationManage)
  add(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddMembersDto,
  ): Promise<ConversationDetailView> {
    return this.useCase.execute(id, user.id, dto);
  }
}
