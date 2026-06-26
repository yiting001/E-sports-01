import { Body, Controller, Param, Post } from '@nestjs/common';
import { ConversationView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { AssignServiceUseCase } from '../../application/use-cases/assign-service.usecase';
import { AssignAgentDto } from '../dto/assign-agent.dto';

/** 路由：管理员指派坐席接入客服会话 */
@Controller('im/service')
export class ServiceAssignController {
  constructor(private readonly useCase: AssignServiceUseCase) {}

  @Post(':id/assign')
  @Permissions(PERMS.im.serviceAgent)
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignAgentDto,
  ): Promise<ConversationView> {
    return this.useCase.execute(id, dto.agentId, user.id);
  }
}
