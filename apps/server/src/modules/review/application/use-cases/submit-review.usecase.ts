import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminReviewView, OrderStatus, SubmitReviewPayload } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../../order/domain/order-repository.interface';
import {
  REVIEW_REPOSITORY,
  ReviewRepository,
} from '../../domain/review-repository.interface';
import { toAdminReviewView } from '../review.mapper';

/**
 * 用例：用户对本人「已完成」订单发表评论（一单一评）。
 * 校验链：订单存在 → 归属本人 → 已完成 → 未评论过，通过后固化订单/商品快照入库。
 */
@Injectable()
export class SubmitReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviews: ReviewRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    userId: string,
    payload: SubmitReviewPayload,
  ): Promise<AdminReviewView> {
    const order = await this.orders.findById(payload.orderId);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('只能评价本人的订单');
    }
    if (order.status !== OrderStatus.Completed) {
      throw new ConflictException('订单完成后才能评价');
    }
    if (await this.reviews.findByOrderId(order.id)) {
      throw new ConflictException('该订单已评价过');
    }
    const entity = this.reviews.create({
      userId,
      orderId: order.id,
      orderNo: order.orderNo,
      productId: order.productId,
      productTitle: order.productTitle,
      rating: payload.rating,
      content: payload.content.trim(),
    });
    const saved = await this.reviews.save(entity);
    const profiles = await this.users.resolveProfiles([userId]);
    return toAdminReviewView(saved, profiles.get(userId));
  }
}
