import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminReviewView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  REVIEW_REPOSITORY,
  ReviewRepository,
} from '../../domain/review-repository.interface';
import { toAdminReviewView } from '../review.mapper';

/** 用例：管理端隐藏/恢复评论（软隐藏，不影响用户「已评价」状态） */
@Injectable()
export class SetReviewVisibilityUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly repo: ReviewRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(id: string, visible: boolean): Promise<AdminReviewView> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('评论不存在');
    }
    record.visible = visible;
    const saved = await this.repo.save(record);
    const profiles = await this.users.resolveProfiles([saved.userId]);
    return toAdminReviewView(saved, profiles.get(saved.userId));
  }
}
