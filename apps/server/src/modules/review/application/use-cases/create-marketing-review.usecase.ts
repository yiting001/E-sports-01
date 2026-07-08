import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminReviewView, CreateMarketingReviewPayload } from '@app/contracts';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../../commerce/domain/product-repository.interface';
import {
  REVIEW_REPOSITORY,
  ReviewRepository,
} from '../../domain/review-repository.interface';
import { toAdminReviewView } from '../review.mapper';

/**
 * 用例：营销工具——管理端为商品添加自定义评论。
 * 无订单来源（orderId 为 NULL），昵称/头像由管理员自定义，
 * 固化商品标题快照，与真实用户评论共用展示/显隐/删除链路。
 */
@Injectable()
export class CreateMarketingReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviews: ReviewRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(payload: CreateMarketingReviewPayload): Promise<AdminReviewView> {
    const product = await this.products.findById(payload.productId);
    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    const entity = this.reviews.create({
      userId: '',
      orderId: null,
      orderNo: '',
      productId: product.id,
      productTitle: product.title,
      rating: payload.rating,
      content: payload.content.trim(),
      reviewerName: payload.reviewerName.trim(),
      avatar: payload.avatar?.trim() ?? '',
    });
    const saved = await this.reviews.save(entity);
    return toAdminReviewView(saved);
  }
}
