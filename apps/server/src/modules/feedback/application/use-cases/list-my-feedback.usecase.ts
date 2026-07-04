import { Inject, Injectable } from '@nestjs/common';
import { FeedbackView, PaginatedResult } from '@app/contracts';
import {
  FEEDBACK_REPOSITORY,
  FeedbackRepository,
} from '../../domain/feedback-repository.interface';
import { toFeedbackView } from '../feedback.mapper';

/** 用例：分页查询当前用户自己的反馈记录 */
@Injectable()
export class ListMyFeedbackUseCase {
  constructor(
    @Inject(FEEDBACK_REPOSITORY)
    private readonly repo: FeedbackRepository,
  ) {}

  async execute(
    userId: string,
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<FeedbackView>> {
    const [rows, total] = await this.repo.paginateByUser(userId, skip, pageSize);
    return { list: rows.map((r) => toFeedbackView(r)), total, page, pageSize };
  }
}
