import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { LeaveConversationUseCase } from '../../application/use-cases/leave-conversation.usecase';

/** 路由：退出会话（自我移除） */
@Controller('im/conversations')
export class ConversationLeaveController {
  constructor(private readonly useCase: LeaveConversationUseCase) {}

  @Post(':id/leave')
  @HttpCode(204)
  leave(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.useCase.execute(id, user.id);
  }
}
