import { Inject, Injectable } from '@nestjs/common';
import { FeedbackView, SubmitFeedbackPayload } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  FEEDBACK_REPOSITORY,
  FeedbackRepository,
} from '../../domain/feedback-repository.interface';
import { toFeedbackView } from '../feedback.mapper';

/** 用例：提交反馈/投诉，入库后进入待处理 */
@Injectable()
export class SubmitFeedbackUseCase {
  constructor(
    @Inject(FEEDBACK_REPOSITORY)
    private readonly repo: FeedbackRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    userId: string,
    payload: SubmitFeedbackPayload,
  ): Promise<FeedbackView> {
    const entity = this.repo.create({
      userId,
      type: payload.type,
      target: payload.target?.trim() ?? '',
      content: payload.content.trim(),
    });
    const saved = await this.repo.save(entity);
    const profiles = await this.users.resolveProfiles([userId]);
    return toFeedbackView(saved, profiles.get(userId));
  }
}
