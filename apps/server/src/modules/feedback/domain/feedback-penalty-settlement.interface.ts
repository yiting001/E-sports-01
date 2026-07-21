import type { CreateFeedbackPenaltyBody } from '@app/contracts';
import { FeedbackEntity } from './feedback.entity';

export interface SettleFeedbackPenaltyInput {
  feedbackId: string;
  operatorId: string;
  /** 非超管为当前租户；超管为 null，决定反馈首行查询范围 */
  scopeTenantId: string | null;
  payload: CreateFeedbackPenaltyBody;
}

export const FEEDBACK_PENALTY_SETTLEMENT = Symbol('FEEDBACK_PENALTY_SETTLEMENT');

/** 投诉扣款一致性端口：实现负责资金、审计记录与反馈状态的原子提交。 */
export interface FeedbackPenaltySettlement {
  settle(input: SettleFeedbackPenaltyInput): Promise<FeedbackEntity>;
}
