import {
  FeedbackStatus,
  FeedbackType,
  type CreateFeedbackPenaltyBody,
  type PenaltySource,
} from '@app/contracts';
import { FeedbackEntity } from './feedback.entity';

export interface ExistingFeedbackPenalty {
  id: string;
  amountFen: number;
  source: PenaltySource;
  reason: string;
}

export type FeedbackPenaltyAttempt = 'create' | 'idempotent';

/** 领域规则拒绝处罚时抛出，由调用边界转换为协议异常。 */
export class FeedbackPenaltyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedbackPenaltyConflictError';
  }
}

/** 在反馈行锁内判定首次处罚或幂等重试，拒绝改变已落账参数。 */
export function resolveFeedbackPenaltyAttempt(
  feedback: FeedbackEntity,
  existing: ExistingFeedbackPenalty | null,
  input: CreateFeedbackPenaltyBody,
): FeedbackPenaltyAttempt {
  if (
    feedback.type !== FeedbackType.Booster ||
    !feedback.orderId ||
    !feedback.orderNo ||
    !feedback.boosterUserId ||
    !feedback.boosterName
  ) {
    throw new FeedbackPenaltyConflictError('反馈未关联可处罚的订单与打手');
  }
  if (feedback.status === FeedbackStatus.Pending) {
    if (feedback.penaltyId || existing) {
      throw new FeedbackPenaltyConflictError('反馈处罚关联状态异常');
    }
    return 'create';
  }
  if (!feedback.penaltyId || !existing || existing.id !== feedback.penaltyId) {
    throw new FeedbackPenaltyConflictError('反馈已处理，不能再发起扣款');
  }
  if (
    existing.amountFen !== input.amountFen ||
    existing.source !== input.source ||
    existing.reason !== input.reason.trim() ||
    feedback.replyContent !== input.replyContent.trim()
  ) {
    throw new FeedbackPenaltyConflictError('该反馈已按其他参数完成扣款');
  }
  return 'idempotent';
}
