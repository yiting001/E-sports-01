import { Inject, Injectable } from '@nestjs/common';
import {
  FeedbackStatus,
  FeedbackType,
  FeedbackView,
  PaginatedResult,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  FEEDBACK_REPOSITORY,
  FeedbackRepository,
} from '../../domain/feedback-repository.interface';
import { toFeedbackView } from '../feedback.mapper';

/** 用例：管理端分页查询反馈列表，可按状态/类型过滤 */
@Injectable()
export class ListFeedbackUseCase {
  constructor(
    @Inject(FEEDBACK_REPOSITORY)
    private readonly repo: FeedbackRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    status?: FeedbackStatus,
    type?: FeedbackType,
  ): Promise<PaginatedResult<FeedbackView>> {
    const [rows, total] = await this.repo.paginate(skip, pageSize, status, type);
    const profiles = await this.users.resolveProfiles(
      rows.map((r) => r.userId),
    );
    const list = rows.map((r) => toFeedbackView(r, profiles.get(r.userId)));
    return { list, total, page, pageSize };
  }
}
