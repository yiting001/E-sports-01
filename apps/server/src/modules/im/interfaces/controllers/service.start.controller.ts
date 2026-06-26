import { Body, Controller, Post } from '@nestjs/common';
import { ConversationView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { StartServiceUseCase } from '../../application/use-cases/start-service.usecase';
import { StartServiceDto } from '../dto/start-service.dto';

/** 路由：访客发起客服会话 */
@Controller('im/service')
export class ServiceStartController {
  constructor(private readonly useCase: StartServiceUseCase) {}

  @Post()
  start(
    @CurrentUser() user: AuthUser,
    @Body() dto: StartServiceDto,
  ): Promise<ConversationView> {
    return this.useCase.execute(user.id, dto);
  }
}
