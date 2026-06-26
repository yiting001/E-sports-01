import { Body, Controller, Post } from '@nestjs/common';
import { ConversationView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CreateGroupUseCase } from '../../application/use-cases/create-group.usecase';
import { CreateGroupDto } from '../dto/create-group.dto';

/** 路由：创建群聊 */
@Controller('im/conversations')
export class ConversationCreateController {
  constructor(private readonly useCase: CreateGroupUseCase) {}

  @Post()
  @Permissions(PERMS.im.conversationCreate)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGroupDto,
  ): Promise<ConversationView> {
    return this.useCase.execute(user.id, dto);
  }
}
