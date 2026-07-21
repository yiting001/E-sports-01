import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { PERMS, type FeedbackView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CreateFeedbackPenaltyUseCase } from '../../application/use-cases/create-feedback-penalty.usecase';
import { CreateFeedbackPenaltyDto } from '../dto/create-feedback-penalty.dto';

/** 路由：对投诉关联的真实订单打手直接扣款并完成反馈。 */
@Controller('feedback')
export class FeedbackPenaltyController {
  constructor(private readonly useCase: CreateFeedbackPenaltyUseCase) {}

  @Post(':id/penalty')
  @Permissions(PERMS.feedback.handle, PERMS.finance.penaltyCreate)
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFeedbackPenaltyDto,
  ): Promise<FeedbackView> {
    return this.useCase.execute(user.id, id, dto);
  }
}
