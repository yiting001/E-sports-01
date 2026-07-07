import { Controller, Get, Query } from '@nestjs/common';
import { ConversationView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { SearchConversationsUseCase } from '../../application/use-cases/search-conversations.usecase';

/** 路由：按关键词搜索我的会话（标题/私聊对方用户名，空关键词返回全部） */
@Controller('im/conversations')
export class ConversationSearchController {
  constructor(private readonly useCase: SearchConversationsUseCase) {}

  @Get('search')
  search(
    @CurrentUser() user: AuthUser,
    @Query('keyword') keyword = '',
  ): Promise<ConversationView[]> {
    return this.useCase.execute(user.id, keyword);
  }
}
