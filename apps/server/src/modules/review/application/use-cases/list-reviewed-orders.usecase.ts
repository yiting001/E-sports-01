import { Inject, Injectable } from '@nestjs/common';
import {
  REVIEW_REPOSITORY,
  ReviewRepository,
} from '../../domain/review-repository.interface';

/** 用例：给定订单集合中，筛出当前用户已评论的订单 id（我的订单页标记「已评价」） */
@Injectable()
export class ListReviewedOrdersUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly repo: ReviewRepository,
  ) {}

  execute(userId: string, orderIds: string[]): Promise<string[]> {
    return this.repo.findReviewedOrderIds(userId, orderIds);
  }
}
