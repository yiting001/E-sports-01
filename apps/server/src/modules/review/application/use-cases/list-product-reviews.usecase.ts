import { Inject, Injectable } from '@nestjs/common';
import { ProductReviewPage } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  REVIEW_REPOSITORY,
  ReviewRepository,
} from '../../domain/review-repository.interface';
import { toReviewPublicView } from '../review.mapper';

/** 用例：商品详情页分页查询可见评论（免登录），附带平均分 */
@Injectable()
export class ListProductReviewsUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly repo: ReviewRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    productId: string,
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<ProductReviewPage> {
    const [rows, total] = await this.repo.paginateVisibleByProduct(
      productId,
      skip,
      pageSize,
    );
    const avg = await this.repo.avgRatingByProduct(productId);
    const profiles = await this.users.resolveProfiles(
      rows.map((row) => row.userId),
    );
    const list = rows.map((row) =>
      toReviewPublicView(row, profiles.get(row.userId)),
    );
    return {
      list,
      total,
      page,
      pageSize,
      avgRating: avg == null ? '' : avg.toFixed(1),
    };
  }
}
