import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FeedbackView, HandleFeedbackPayload } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  FEEDBACK_REPOSITORY,
  FeedbackRepository,
} from '../../domain/feedback-repository.interface';
import { toFeedbackView } from '../feedback.mapper';

/** 用例：处理反馈（填写处理回复并标记已处理），仅对待处理记录有效 */
@Injectable()
export class HandleFeedbackUseCase {
  constructor(
    @Inject(FEEDBACK_REPOSITORY)
    private readonly repo: FeedbackRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    handlerId: string,
    id: string,
    payload: HandleFeedbackPayload,
  ): Promise<FeedbackView> {
    const result = await this.repo.resolvePending(id, handlerId, payload.replyContent.trim());
    if (result.outcome === 'not_found') {
      throw new NotFoundException('反馈记录不存在');
    }
    if (result.outcome === 'already_resolved') {
      throw new ConflictException('该反馈已处理');
    }
    const saved = result.entity;
    const profiles = await this.users.resolveProfiles([saved.userId]);
    return toFeedbackView(saved, profiles.get(saved.userId));
  }
}
