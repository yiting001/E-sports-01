import { Controller, Get, Query } from '@nestjs/common';
import { ChatMessage } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { GetHistoryUseCase } from '../../application/use-cases/get-history.usecase';

/** 路由：拉取会话历史消息（REST 入口，供首屏加载） */
@Controller('im/messages')
export class MessageHistoryController {
  constructor(private readonly useCase: GetHistoryUseCase) {}

  @Get()
  @Permissions(PERMS.im.history)
  list(
    @Query('conversationId') conversationId: string,
  ): Promise<ChatMessage[]> {
    return this.useCase.execute(conversationId);
  }
}
