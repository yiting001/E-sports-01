import { Body, Controller, Param, Post } from '@nestjs/common';
import { FeedbackView, PERMS } from '@app/contracts';
import { HandleFeedbackUseCase } from '../../application/use-cases/handle-feedback.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { HandleFeedbackDto } from '../dto/handle-feedback.dto';

/**
 * 路由：处理反馈（POST /feedback/:id/handle）。
 * 需 feedback:handle 权限；填写处理回复后标记已处理。
 */
@Controller('feedback')
export class FeedbackHandleController {
  constructor(private readonly useCase: HandleFeedbackUseCase) {}

  @Post(':id/handle')
  @Permissions(PERMS.feedback.handle)
  handle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: HandleFeedbackDto,
  ): Promise<FeedbackView> {
    return this.useCase.execute(user.id, id, dto);
  }
}
