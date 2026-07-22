import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { MemberProfileEntity } from '../domain/member-profile.entity';

export const MEMBER_SPEND_TRANSACTION_PARTICIPANT = Symbol('MEMBER_SPEND_TRANSACTION_PARTICIPANT');

export interface RollbackMemberSpendInput {
  tenantId: string;
  userId: string;
  amountFen: number;
}

export type RecordMemberSpendInput = RollbackMemberSpendInput;

/** 供订单支付与退款跨聚合事务使用的会员累计消费窄写端口。 */
export interface MemberSpendTransactionParticipant {
  record(manager: EntityManager, input: RecordMemberSpendInput): Promise<void>;
  rollback(manager: EntityManager, input: RollbackMemberSpendInput): Promise<void>;
}

@Injectable()
export class TypeormMemberSpendTransactionParticipant implements MemberSpendTransactionParticipant {
  async record(manager: EntityManager, input: RecordMemberSpendInput): Promise<void> {
    if (input.amountFen <= 0) {
      return;
    }
    const repository = manager.getRepository(MemberProfileEntity);
    await repository
      .createQueryBuilder()
      .insert()
      .values({ tenantId: input.tenantId, userId: input.userId, spendFen: 0 })
      .orIgnore()
      .execute();
    const result = await repository.increment(
      { tenantId: input.tenantId, userId: input.userId },
      'spendFen',
      input.amountFen,
    );
    if (result.affected !== 1) {
      throw new Error('会员累计消费入账失败');
    }
  }

  async rollback(manager: EntityManager, input: RollbackMemberSpendInput): Promise<void> {
    if (input.amountFen <= 0) {
      return;
    }
    const result = await manager
      .createQueryBuilder()
      .update(MemberProfileEntity)
      .set({ spendFen: () => '"spend_fen" - :amountFen' })
      .where('"tenant_id" = :tenantId AND "user_id" = :userId AND "spend_fen" >= :amountFen', input)
      .setParameter('amountFen', input.amountFen)
      .execute();
    if (result.affected !== 1) {
      throw new Error('会员累计消费冲正失败');
    }
  }
}
