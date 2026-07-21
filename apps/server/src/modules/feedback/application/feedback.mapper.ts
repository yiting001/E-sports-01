import { FeedbackView } from '@app/contracts';
import { FeedbackEntity } from '../domain/feedback.entity';

/** 提交人简要信息（用于在管理端列表上展示） */
export interface FeedbackUserBrief {
  username: string;
  nickname: string;
}

/** 领域实体 → 对外视图 */
export function toFeedbackView(
  entity: FeedbackEntity,
  user: FeedbackUserBrief = { username: '', nickname: '' },
): FeedbackView {
  return {
    id: entity.id,
    userId: entity.userId,
    username: user.username,
    nickname: user.nickname,
    type: entity.type,
    target: entity.target,
    orderId: entity.orderId,
    orderNo: entity.orderNo,
    boosterUserId: entity.boosterUserId,
    boosterName: entity.boosterName,
    penaltyId: entity.penaltyId ?? '',
    content: entity.content,
    status: entity.status,
    replyContent: entity.replyContent,
    handledBy: entity.handledBy,
    handledAt: entity.handledAt ? entity.handledAt.toISOString() : '',
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
