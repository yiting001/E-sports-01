import { Controller, Get, Param } from '@nestjs/common';
import { ConversationDetailView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { GetConversationDetailUseCase } from '../../application/use-cases/get-conversation-detail.usecase';

/** 路由：会话详情（含成员清单，需为成员） */
@Controller('im/conversations')
export class ConversationDetailController {
  constructor(private readonly useCase: GetConversationDetailUseCase) {}

  @Get(':id')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ConversationDetailView> {
    return this.useCase.execute(id, user.id);
  }
}
