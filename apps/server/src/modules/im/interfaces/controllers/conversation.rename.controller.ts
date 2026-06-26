import { Body, Controller, Param, Put } from '@nestjs/common';
import { ConversationView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { RenameGroupUseCase } from '../../application/use-cases/rename-group.usecase';
import { RenameGroupDto } from '../dto/rename-group.dto';

/** 路由：群聊改名 */
@Controller('im/conversations')
export class ConversationRenameController {
  constructor(private readonly useCase: RenameGroupUseCase) {}

  @Put(':id')
  @Permissions(PERMS.im.conversationManage)
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RenameGroupDto,
  ): Promise<ConversationView> {
    return this.useCase.execute(id, user.id, dto);
  }
}
