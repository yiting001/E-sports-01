import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  REVIEW_REPOSITORY,
  ReviewRepository,
} from '../../domain/review-repository.interface';

/** 用例：管理端删除评论（硬删除，删除后该订单可重新评价） */
@Injectable()
export class RemoveReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly repo: ReviewRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('评论不存在');
    }
    await this.repo.remove(record);
  }
}
