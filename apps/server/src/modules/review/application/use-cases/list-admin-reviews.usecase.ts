import { Inject, Injectable } from '@nestjs/common';
import { AdminReviewView, PaginatedResult } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  AdminReviewFilter,
  REVIEW_REPOSITORY,
  ReviewRepository,
} from '../../domain/review-repository.interface';
import { toAdminReviewView } from '../review.mapper';

/** 用例：管理端分页检索评论，可按星级/可见状态过滤 */
@Injectable()
export class ListAdminReviewsUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly repo: ReviewRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    filter: AdminReviewFilter,
  ): Promise<PaginatedResult<AdminReviewView>> {
    const [rows, total] = await this.repo.paginateAdmin(skip, pageSize, filter);
    const profiles = await this.users.resolveProfiles(
      rows.map((row) => row.userId),
    );
    const list = rows.map((row) =>
      toAdminReviewView(row, profiles.get(row.userId)),
    );
    return { list, total, page, pageSize };
  }
}
