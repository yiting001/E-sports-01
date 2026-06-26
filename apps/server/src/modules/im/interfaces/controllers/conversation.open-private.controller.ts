import { Body, Controller, Post } from '@nestjs/common';
import { ConversationView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { OpenPrivateUseCase } from '../../application/use-cases/open-private.usecase';
import { OpenPrivateDto } from '../dto/open-private.dto';

/** 路由：打开与某用户的私聊（存在则复用） */
@Controller('im/conversations')
export class ConversationOpenPrivateController {
  constructor(private readonly useCase: OpenPrivateUseCase) {}

  @Post('private')
  open(
    @CurrentUser() user: AuthUser,
    @Body() dto: OpenPrivateDto,
  ): Promise<ConversationView> {
    return this.useCase.execute(user.id, dto.peerId);
  }
}
