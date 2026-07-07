import { Controller, Get, Query } from '@nestjs/common';
import { ChatMessage, PaginatedResult } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { SearchMessagesUseCase } from '../../application/use-cases/search-messages.usecase';
import { SearchMessagesQueryDto } from '../dto/search-messages.dto';

/** 路由：搜索会话内聊天记录（关键词 + 日期范围，仅会话成员可搜） */
@Controller('im/messages')
export class MessageSearchController {
  constructor(private readonly useCase: SearchMessagesUseCase) {}

  @Get('search')
  @Permissions(PERMS.im.history)
  search(
    @CurrentUser() user: AuthUser,
    @Query() query: SearchMessagesQueryDto,
  ): Promise<PaginatedResult<ChatMessage>> {
    return this.useCase.execute(user.id, {
      conversationId: query.conversationId,
      keyword: query.keyword,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
      skip: query.skip,
    });
  }
}
