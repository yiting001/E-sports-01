import { Body, Controller, Post } from '@nestjs/common';
import { FeedbackView } from '@app/contracts';
import { SubmitFeedbackUseCase } from '../../application/use-cases/submit-feedback.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { SubmitFeedbackDto } from '../dto/submit-feedback.dto';

/**
 * 路由：提交反馈/投诉（POST /feedback）。
 * 仅登录态，所有角色可用；提交后进入待处理。
 */
@Controller('feedback')
export class FeedbackSubmitController {
  constructor(private readonly useCase: SubmitFeedbackUseCase) {}

  @Post()
  submit(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitFeedbackDto,
  ): Promise<FeedbackView> {
    return this.useCase.execute(user.id, dto);
  }
}
