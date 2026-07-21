import { type OrderStatus } from '@app/contracts';
import { Injectable } from '@nestjs/common';
import { type EntityManager } from 'typeorm';
import { OrderEntity } from '../domain/order.entity';

export const ORDER_FEEDBACK_PENALTY_TRANSACTION = Symbol('ORDER_FEEDBACK_PENALTY_TRANSACTION');

export interface OrderFeedbackPenaltyTransactionInput {
  orderId: string;
  tenantId: string;
  userId: string;
  orderNo: string;
  boosterId: string;
  boosterName: string;
  allowedStatuses: readonly OrderStatus[];
}

export type OrderFeedbackPenaltyTransactionResult =
  | { outcome: 'verified' }
  | { outcome: 'not_found' }
  | { outcome: 'mismatch' };

export interface OrderFeedbackPenaltyTransaction {
  lockAndVerify(
    manager: EntityManager,
    input: OrderFeedbackPenaltyTransactionInput,
  ): Promise<OrderFeedbackPenaltyTransactionResult>;
}

/** 在调用方事务内锁定订单并复核投诉快照，不向订单模块外泄漏持久化实体。 */
@Injectable()
export class TypeormOrderFeedbackPenaltyTransaction implements OrderFeedbackPenaltyTransaction {
  async lockAndVerify(
    manager: EntityManager,
    input: OrderFeedbackPenaltyTransactionInput,
  ): Promise<OrderFeedbackPenaltyTransactionResult> {
    const order = await manager.getRepository(OrderEntity).findOne({
      where: { id: input.orderId, tenantId: input.tenantId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!order) {
      return { outcome: 'not_found' };
    }

    const matches =
      order.userId === input.userId &&
      order.orderNo === input.orderNo &&
      order.boosterId === input.boosterId &&
      order.boosterName === input.boosterName &&
      input.allowedStatuses.includes(order.status);
    return { outcome: matches ? 'verified' : 'mismatch' };
  }
}
