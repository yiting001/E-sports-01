import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { FeedbackView } from '@app/contracts';
import { SubmitFeedbackUseCase } from '../../application/use-cases/submit-feedback.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { SubmitFeedbackDto } from '../dto/submit-feedback.dto';
import {
  FeedbackOrderSnapshotError,
  FeedbackOrderSnapshotErrorCode,
} from '../../application/feedback-order-snapshot';

/**
 * 路由：提交反馈/投诉（POST /feedback）。
 * 仅登录态，所有角色可用；提交后进入待处理。
 */
@Controller('feedback')
export class FeedbackSubmitController {
  constructor(private readonly useCase: SubmitFeedbackUseCase) {}

  @Post()
  async submit(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitFeedbackDto,
  ): Promise<FeedbackView> {
    try {
      return await this.useCase.execute(user.id, dto);
    } catch (error) {
      if (!(error instanceof FeedbackOrderSnapshotError)) {
        throw error;
      }
      switch (error.code) {
        case FeedbackOrderSnapshotErrorCode.OrderNotFound:
          throw new NotFoundException(error.message);
        case FeedbackOrderSnapshotErrorCode.BoosterUnavailable:
          throw new ConflictException(error.message);
        case FeedbackOrderSnapshotErrorCode.OrderNotAllowed:
        case FeedbackOrderSnapshotErrorCode.OrderRequired:
          throw new BadRequestException(error.message);
      }
    }
  }
}
