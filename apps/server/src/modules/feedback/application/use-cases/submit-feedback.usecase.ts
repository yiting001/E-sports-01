import { Inject, Injectable } from '@nestjs/common';
import { FeedbackType, FeedbackView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../../order/domain/order-repository.interface';
import {
  FEEDBACK_REPOSITORY,
  FeedbackRepository,
} from '../../domain/feedback-repository.interface';
import { toFeedbackView } from '../feedback.mapper';
import { resolveFeedbackOrderSnapshot } from '../feedback-order-snapshot';

/** 用例：提交反馈/投诉，入库后进入待处理 */
export interface SubmitFeedbackInput {
  type: FeedbackType;
  target?: string;
  orderId?: string;
  content: string;
}

@Injectable()
export class SubmitFeedbackUseCase {
  constructor(
    @Inject(FEEDBACK_REPOSITORY)
    private readonly repo: FeedbackRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(userId: string, payload: SubmitFeedbackInput): Promise<FeedbackView> {
    const orderId = payload.orderId?.trim();
    const order =
      payload.type === FeedbackType.Booster && orderId ? await this.orders.findById(orderId) : null;
    const orderSnapshot = resolveFeedbackOrderSnapshot({
      userId,
      type: payload.type,
      orderId,
      order,
    });
    const entity = this.repo.create({
      userId,
      type: payload.type,
      target: orderSnapshot?.target ?? payload.target?.trim() ?? '',
      orderId: orderSnapshot?.orderId ?? '',
      orderNo: orderSnapshot?.orderNo ?? '',
      boosterUserId: orderSnapshot?.boosterUserId ?? '',
      boosterName: orderSnapshot?.boosterName ?? '',
      penaltyId: null,
      content: payload.content.trim(),
    });
    const saved = await this.repo.save(entity);
    const profiles = await this.users.resolveProfiles([userId]);
    return toFeedbackView(saved, profiles.get(userId));
  }
}
