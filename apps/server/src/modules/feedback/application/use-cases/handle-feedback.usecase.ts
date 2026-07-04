import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FeedbackStatus,
  FeedbackView,
  HandleFeedbackPayload,
} from '@app/contracts';
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
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('反馈记录不存在');
    }
    if (record.status !== FeedbackStatus.Pending) {
      throw new ConflictException('该反馈已处理');
    }
    record.status = FeedbackStatus.Resolved;
    record.replyContent = payload.replyContent.trim();
    record.handledBy = handlerId;
    record.handledAt = new Date();
    const saved = await this.repo.save(record);
    const profiles = await this.users.resolveProfiles([saved.userId]);
    return toFeedbackView(saved, profiles.get(saved.userId));
  }
}
