import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  FeedbackStatus,
  FundDirection,
  OrderStatus,
  PenaltySource,
  WalletTxnType,
  fenToYuan,
} from '@app/contracts';
import { DataSource, EntityManager } from 'typeorm';
import {
  BOOSTER_FEEDBACK_PENALTY_TRANSACTION,
  BoosterFeedbackPenaltyTransaction,
} from '../../booster/infrastructure/booster-feedback-penalty.transaction';
import {
  ORDER_FEEDBACK_PENALTY_TRANSACTION,
  OrderFeedbackPenaltyTransaction,
} from '../../order/infrastructure/order-feedback-penalty.transaction';
import {
  WALLET_TRANSACTION_PARTICIPANT,
  WalletTransactionParticipant,
} from '../../wallet/infrastructure/wallet-transaction.participant';
import {
  FeedbackPenaltySettlement,
  SettleFeedbackPenaltyInput,
} from '../domain/feedback-penalty-settlement.interface';
import {
  FeedbackPenaltyConflictError,
  resolveFeedbackPenaltyAttempt,
} from '../domain/feedback-penalty.policy';
import { FeedbackEntity } from '../domain/feedback.entity';

const PENALTY_ORDER_STATUSES = [OrderStatus.Serving, OrderStatus.Completed] as const;

/** TypeORM 投诉扣款事务：锁定反馈与资金来源后，原子写入全部审计状态。 */
@Injectable()
export class TypeormFeedbackPenaltySettlement implements FeedbackPenaltySettlement {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(ORDER_FEEDBACK_PENALTY_TRANSACTION)
    private readonly orderTransaction: OrderFeedbackPenaltyTransaction,
    @Inject(WALLET_TRANSACTION_PARTICIPANT)
    private readonly walletTransaction: WalletTransactionParticipant,
    @Inject(BOOSTER_FEEDBACK_PENALTY_TRANSACTION)
    private readonly boosterTransaction: BoosterFeedbackPenaltyTransaction,
  ) {}

  settle(input: SettleFeedbackPenaltyInput): Promise<FeedbackEntity> {
    return this.dataSource.transaction(async (manager) => {
      const feedback = await manager.getRepository(FeedbackEntity).findOne({
        where: {
          id: input.feedbackId,
          ...(input.scopeTenantId ? { tenantId: input.scopeTenantId } : {}),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!feedback) {
        throw new NotFoundException('反馈记录不存在');
      }

      const payload = {
        ...input.payload,
        reason: input.payload.reason.trim(),
        replyContent: input.payload.replyContent.trim(),
      };
      if (!payload.reason) {
        throw new BadRequestException('罚款理由不能为空');
      }
      if (!payload.replyContent) {
        throw new BadRequestException('处理回复不能为空');
      }
      if (!Number.isSafeInteger(payload.amountFen) || payload.amountFen <= 0) {
        throw new BadRequestException('罚款金额须为安全正整数');
      }
      const existingPenalty = await this.boosterTransaction.findByFeedbackId(manager, {
        tenantId: feedback.tenantId,
        feedbackId: feedback.id,
      });
      let attempt: ReturnType<typeof resolveFeedbackPenaltyAttempt>;
      try {
        attempt = resolveFeedbackPenaltyAttempt(feedback, existingPenalty, payload);
      } catch (error) {
        if (error instanceof FeedbackPenaltyConflictError) {
          throw new ConflictException(error.message);
        }
        throw error;
      }
      if (attempt === 'idempotent') {
        return feedback;
      }

      await this.lockAndVerifyOrder(manager, feedback);
      if (payload.source === PenaltySource.Deposit) {
        await this.deductDeposit(manager, feedback, payload.amountFen);
      } else {
        await this.deductBalance(manager, feedback, payload.amountFen, payload.reason);
      }

      const penaltyId = await this.boosterTransaction.createPenalty(manager, {
        tenantId: feedback.tenantId,
        feedbackId: feedback.id,
        boosterUserId: feedback.boosterUserId,
        orderNo: feedback.orderNo,
        amountFen: payload.amountFen,
        source: payload.source,
        reason: payload.reason,
        createdBy: input.operatorId,
      });

      feedback.status = FeedbackStatus.Resolved;
      feedback.replyContent = payload.replyContent;
      feedback.handledBy = input.operatorId;
      feedback.handledAt = new Date();
      feedback.penaltyId = penaltyId;
      return manager.getRepository(FeedbackEntity).save(feedback);
    });
  }

  private async lockAndVerifyOrder(
    manager: EntityManager,
    feedback: FeedbackEntity,
  ): Promise<void> {
    const result = await this.orderTransaction.lockAndVerify(manager, {
      orderId: feedback.orderId,
      tenantId: feedback.tenantId,
      userId: feedback.userId,
      orderNo: feedback.orderNo,
      boosterId: feedback.boosterUserId,
      boosterName: feedback.boosterName,
      allowedStatuses: PENALTY_ORDER_STATUSES,
    });
    if (result.outcome === 'not_found') {
      throw new ConflictException('关联订单不存在或租户不一致');
    }
    if (result.outcome === 'mismatch') {
      throw new ConflictException('反馈关联的订单或实际打手已不一致');
    }
  }

  private async deductDeposit(
    manager: EntityManager,
    feedback: FeedbackEntity,
    amountFen: number,
  ): Promise<void> {
    const result = await this.boosterTransaction.deductDeposit(manager, {
      tenantId: feedback.tenantId,
      boosterUserId: feedback.boosterUserId,
      amountFen,
    });
    if (result.outcome === 'not_found') {
      throw new NotFoundException('关联打手入驻记录不存在');
    }
    if (result.outcome === 'insufficient') {
      throw new BadRequestException('押金余额不足，无法从押金扣除');
    }
  }

  private async deductBalance(
    manager: EntityManager,
    feedback: FeedbackEntity,
    amountFen: number,
    reason: string,
  ): Promise<void> {
    const result = await this.walletTransaction.adjust(manager, {
      tenantId: feedback.tenantId,
      userId: feedback.boosterUserId,
      amountFen,
      direction: FundDirection.Out,
      type: WalletTxnType.Penalty,
      bizOrderId: feedback.id,
      remark: `投诉罚款 ${fenToYuan(amountFen)} 元：${reason}`,
      createIfMissing: false,
    });
    if (result.outcome === 'not_found') {
      throw new NotFoundException('关联打手钱包不存在');
    }
    if (result.outcome === 'insufficient') {
      throw new BadRequestException('钱包余额不足，无法扣除');
    }
  }
}
