import { type PenaltySource } from '@app/contracts';
import { Injectable } from '@nestjs/common';
import { type EntityManager } from 'typeorm';
import { BoosterApplicationEntity } from '../domain/booster-application.entity';
import { BoosterPenaltyEntity } from '../domain/booster-penalty.entity';

export const BOOSTER_FEEDBACK_PENALTY_TRANSACTION = Symbol('BOOSTER_FEEDBACK_PENALTY_TRANSACTION');

export interface ExistingFeedbackPenaltySnapshot {
  id: string;
  amountFen: number;
  source: PenaltySource;
  reason: string;
}

export interface FindFeedbackPenaltyInput {
  tenantId: string;
  feedbackId: string;
}

export interface CreateFeedbackPenaltyInput {
  tenantId: string;
  feedbackId: string;
  boosterUserId: string;
  orderNo: string;
  amountFen: number;
  source: PenaltySource;
  reason: string;
  createdBy: string;
}

export interface DeductBoosterDepositInput {
  tenantId: string;
  boosterUserId: string;
  amountFen: number;
}

export type DeductBoosterDepositResult =
  | { outcome: 'deducted' }
  | { outcome: 'not_found' }
  | { outcome: 'insufficient' };

export interface BoosterFeedbackPenaltyTransaction {
  findByFeedbackId(
    manager: EntityManager,
    input: FindFeedbackPenaltyInput,
  ): Promise<ExistingFeedbackPenaltySnapshot | null>;
  deductDeposit(
    manager: EntityManager,
    input: DeductBoosterDepositInput,
  ): Promise<DeductBoosterDepositResult>;
  createPenalty(manager: EntityManager, input: CreateFeedbackPenaltyInput): Promise<string>;
}

/** 在调用方事务内读写反馈处罚与押金，不向打手模块外泄漏持久化实体。 */
@Injectable()
export class TypeormBoosterFeedbackPenaltyTransaction implements BoosterFeedbackPenaltyTransaction {
  async findByFeedbackId(
    manager: EntityManager,
    input: FindFeedbackPenaltyInput,
  ): Promise<ExistingFeedbackPenaltySnapshot | null> {
    const penalty = await manager.getRepository(BoosterPenaltyEntity).findOne({
      where: {
        tenantId: input.tenantId,
        feedbackId: input.feedbackId,
      },
    });

    return penalty
      ? {
          id: penalty.id,
          amountFen: penalty.amountFen,
          source: penalty.source,
          reason: penalty.reason,
        }
      : null;
  }

  async deductDeposit(
    manager: EntityManager,
    input: DeductBoosterDepositInput,
  ): Promise<DeductBoosterDepositResult> {
    const repository = manager.getRepository(BoosterApplicationEntity);
    const booster = await repository.findOne({
      where: {
        tenantId: input.tenantId,
        userId: input.boosterUserId,
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!booster) {
      return { outcome: 'not_found' };
    }
    if (booster.depositFen < input.amountFen) {
      return { outcome: 'insufficient' };
    }

    await repository.update(
      { id: booster.id, tenantId: booster.tenantId },
      { depositFen: booster.depositFen - input.amountFen },
    );
    return { outcome: 'deducted' };
  }

  async createPenalty(manager: EntityManager, input: CreateFeedbackPenaltyInput): Promise<string> {
    const repository = manager.getRepository(BoosterPenaltyEntity);
    const penalty = repository.create(input);
    const saved = await repository.save(penalty);
    return saved.id;
  }
}
