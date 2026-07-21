import { PenaltySource } from '@app/contracts';
import { BoosterApplicationEntity } from './booster-application.entity';
import { BoosterPenaltyEntity } from './booster-penalty.entity';

export const BOOSTER_FINANCE_SETTLEMENT = Symbol('BOOSTER_FINANCE_SETTLEMENT');

export interface PayBoosterDepositInput {
  userId: string;
  amountFen: number;
  maxFen: number;
}

export type PayBoosterDepositResult =
  | { outcome: 'paid'; booster: BoosterApplicationEntity }
  | { outcome: 'not_approved' }
  | { outcome: 'maximum_reached' }
  | { outcome: 'maximum_exceeded'; availableFen: number }
  | { outcome: 'wallet_not_found' }
  | { outcome: 'insufficient_balance' };

export type RefundBoosterDepositResult =
  | { outcome: 'refunded'; booster: BoosterApplicationEntity; amountFen: number }
  | { outcome: 'not_found' }
  | { outcome: 'empty' }
  | { outcome: 'wallet_not_found' };

export interface CreateBoosterPenaltyInput {
  operatorId: string;
  boosterUserId: string;
  orderNo: string;
  amountFen: number;
  source: PenaltySource;
  reason: string;
}

export type CreateBoosterPenaltyResult =
  | { outcome: 'created'; penalty: BoosterPenaltyEntity }
  | { outcome: 'booster_not_found' }
  | { outcome: 'insufficient_deposit' }
  | { outcome: 'wallet_not_found' }
  | { outcome: 'insufficient_balance' };

/** 打手押金、钱包流水与通用罚款的原子结算端口。 */
export interface BoosterFinanceSettlement {
  payDeposit(input: PayBoosterDepositInput): Promise<PayBoosterDepositResult>;
  refundDeposit(applicationId: string): Promise<RefundBoosterDepositResult>;
  createPenalty(input: CreateBoosterPenaltyInput): Promise<CreateBoosterPenaltyResult>;
}
