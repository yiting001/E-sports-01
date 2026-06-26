import { Controller, Get } from '@nestjs/common';
import { ConversationView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ListConversationsUseCase } from '../../application/use-cases/list-conversations.usecase';

/** 路由：我的会话列表（私聊/群聊/客服按最近活跃排序） */
@Controller('im/conversations')
export class ConversationListController {
  constructor(private readonly useCase: ListConversationsUseCase) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ConversationView[]> {
    return this.useCase.execute(user.id);
  }
}
