import { Inject, Injectable } from '@nestjs/common';
import { type CreateFeedbackPenaltyBody, type FeedbackView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import {
  FEEDBACK_PENALTY_SETTLEMENT,
  FeedbackPenaltySettlement,
} from '../../domain/feedback-penalty-settlement.interface';
import { toFeedbackView } from '../feedback.mapper';

/** 用例：对结构化打手投诉直接扣款，并返回已处理反馈。 */
@Injectable()
export class CreateFeedbackPenaltyUseCase {
  constructor(
    @Inject(FEEDBACK_PENALTY_SETTLEMENT)
    private readonly settlement: FeedbackPenaltySettlement,
    private readonly users: UserDirectory,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(
    operatorId: string,
    feedbackId: string,
    payload: CreateFeedbackPenaltyBody,
  ): Promise<FeedbackView> {
    const feedback = await this.settlement.settle({
      operatorId,
      feedbackId,
      scopeTenantId: this.tenant.scopeId(),
      payload,
    });
    const profiles = await this.users.resolveProfiles([feedback.userId]);
    return toFeedbackView(feedback, profiles.get(feedback.userId));
  }
}
