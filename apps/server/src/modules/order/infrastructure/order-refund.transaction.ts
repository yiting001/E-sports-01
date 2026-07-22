import { Inject, Injectable } from '@nestjs/common';
import {
  FundDirection,
  OrderPaymentMethod,
  OrderRefundStatus,
  OrderStatus,
  WalletTxnType,
} from '@app/contracts';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  PRODUCT_SALES_TRANSACTION_PARTICIPANT,
  ProductSalesTransactionParticipant,
} from '../../commerce/infrastructure/product-sales-transaction.participant';
import {
  MEMBER_SPEND_TRANSACTION_PARTICIPANT,
  MemberSpendTransactionParticipant,
} from '../../member/infrastructure/member-spend-transaction.participant';
import {
  WALLET_TRANSACTION_PARTICIPANT,
  WalletTransactionParticipant,
} from '../../wallet/infrastructure/wallet-transaction.participant';
import { OrderRefundAttemptEntity } from '../domain/order-refund-attempt.entity';
import { OrderRefundEntity } from '../domain/order-refund.entity';
import { canRequestOrderRefund } from '../domain/order-refund.rules';
import {
  BeginOrderRefundResult,
  CompleteOrderRefundInput,
  CompleteOrderRefundResult,
  FailOrderRefundInput,
  OrderRefundBundle,
  OrderRefundTransaction,
  RecordOrderRefundChannelResult,
  RecordOrderRefundChannelResultInput,
  RejectOrderRefundInput,
  RejectOrderRefundResult,
  RequestOrderRefundInput,
  RequestOrderRefundResult,
  ReviewOrderRefundInput,
} from '../domain/order-refund-transaction.interface';
import { OrderEntity } from '../domain/order.entity';

/** TypeORM 退款事务；全路径固定按 order → refund → wallet/product/member 加锁或窄写。 */
@Injectable()
export class TypeormOrderRefundTransaction implements OrderRefundTransaction {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(WALLET_TRANSACTION_PARTICIPANT)
    private readonly wallets: WalletTransactionParticipant,
    @Inject(PRODUCT_SALES_TRANSACTION_PARTICIPANT)
    private readonly productSales: ProductSalesTransactionParticipant,
    @Inject(MEMBER_SPEND_TRANSACTION_PARTICIPANT)
    private readonly memberSpend: MemberSpendTransactionParticipant,
  ) {}

  request(input: RequestOrderRefundInput): Promise<RequestOrderRefundResult> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, input.tenantId, input.orderId);
      if (!order || order.userId !== input.userId) {
        return { outcome: 'not_found' };
      }
      if (!canRequestOrderRefund(order.status)) {
        return { outcome: 'invalid_status' };
      }
      const existing = await this.lockRefundByOrder(manager, input.tenantId, order.id);
      if (existing) {
        return { outcome: 'already_requested' };
      }

      const refundRepository = manager.getRepository(OrderRefundEntity);
      const refund = refundRepository.create({
        tenantId: order.tenantId,
        orderId: order.id,
        userId: order.userId,
        refundNo: input.refundNo,
        amountFen: order.amountFen,
        paymentMethod: order.provider,
        sourceOrderStatus: order.status,
        reason: input.reason,
        status: OrderRefundStatus.PendingReview,
        channelRefundNo: '',
        attempt: 0,
        providerRefundNo: '',
        reviewerId: '',
        reviewedAt: null,
        rejectReason: '',
        failReason: '',
        refundedAt: null,
      });
      const savedRefund = await refundRepository.save(refund);
      order.status = OrderStatus.RefundReviewing;
      const savedOrder = await manager.getRepository(OrderEntity).save(order);
      return this.bundle('created', savedOrder, savedRefund);
    });
  }

  begin(input: ReviewOrderRefundInput): Promise<BeginOrderRefundResult> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, input.tenantId, input.orderId);
      if (!order) {
        return { outcome: 'not_found' };
      }
      const refund = await this.lockRefundByOrder(manager, input.tenantId, order.id);
      if (!refund) {
        return { outcome: 'not_found' };
      }
      if (refund.status === OrderRefundStatus.Succeeded && order.status === OrderStatus.Refunded) {
        return this.bundle('already_succeeded', order, refund);
      }
      if (order.status !== OrderStatus.RefundReviewing) {
        return { outcome: 'invalid_status' };
      }
      if (refund.status === OrderRefundStatus.Processing) {
        return this.bundle('already_processing', order, refund);
      }
      if (
        refund.status !== OrderRefundStatus.PendingReview &&
        refund.status !== OrderRefundStatus.Failed
      ) {
        return { outcome: 'invalid_status' };
      }

      const outcome = refund.status === OrderRefundStatus.Failed ? 'retry_started' : 'started';
      const startsChannelAttempt = this.requiresChannelAttempt(refund);
      if (
        startsChannelAttempt &&
        (!input.channelRefundNo.trim() || input.channelRefundNo === refund.channelRefundNo)
      ) {
        return { outcome: 'invalid_status' };
      }
      const now = new Date();
      refund.status = OrderRefundStatus.Processing;
      if (!refund.reviewedAt) {
        refund.reviewerId = input.reviewerId;
        refund.reviewedAt = now;
      }
      refund.failReason = '';
      if (startsChannelAttempt) {
        refund.attempt += 1;
        refund.channelRefundNo = input.channelRefundNo;
        refund.providerRefundNo = '';
      }
      const saved = await manager.getRepository(OrderRefundEntity).save(refund);
      if (startsChannelAttempt) {
        await manager.getRepository(OrderRefundAttemptEntity).save({
          tenantId: saved.tenantId,
          refundId: saved.id,
          attempt: saved.attempt,
          channelRefundNo: saved.channelRefundNo,
          reviewerId: input.reviewerId,
          providerRefundNo: '',
          status: OrderRefundStatus.Processing,
          failReason: '',
          startedAt: now,
          finishedAt: null,
        });
      }
      return this.bundle(outcome, order, saved);
    });
  }

  reject(input: RejectOrderRefundInput): Promise<RejectOrderRefundResult> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, input.tenantId, input.orderId);
      if (!order) {
        return { outcome: 'not_found' };
      }
      const refund = await this.lockRefundByOrder(manager, input.tenantId, order.id);
      if (!refund) {
        return { outcome: 'not_found' };
      }
      if (
        order.status !== OrderStatus.RefundReviewing ||
        refund.status !== OrderRefundStatus.PendingReview
      ) {
        return { outcome: 'invalid_status' };
      }

      order.status = refund.sourceOrderStatus;
      refund.status = OrderRefundStatus.Rejected;
      refund.reviewerId = input.reviewerId;
      refund.reviewedAt = new Date();
      refund.rejectReason = input.reason;
      const savedOrder = await manager.getRepository(OrderEntity).save(order);
      const savedRefund = await manager.getRepository(OrderRefundEntity).save(refund);
      return this.bundle('rejected', savedOrder, savedRefund);
    });
  }

  recordChannelResult(
    input: RecordOrderRefundChannelResultInput,
  ): Promise<RecordOrderRefundChannelResult> {
    return this.dataSource.transaction(async (manager) => {
      const lookup = await manager.getRepository(OrderRefundEntity).findOne({
        where: { id: input.refundId, tenantId: input.tenantId },
      });
      if (!lookup) {
        return { outcome: 'not_found' };
      }
      const order = await this.lockOrder(manager, input.tenantId, lookup.orderId);
      if (!order) {
        return { outcome: 'not_found' };
      }
      const refund = await this.lockRefundByOrder(manager, input.tenantId, order.id);
      if (
        !refund ||
        refund.id !== input.refundId ||
        refund.status !== OrderRefundStatus.Processing ||
        refund.channelRefundNo !== input.channelRefundNo
      ) {
        return { outcome: 'invalid_status' };
      }
      const attempt = await this.lockAttempt(manager, refund, input.channelRefundNo);
      if (!attempt || this.hasProviderRefundNoConflict(refund, attempt, input.providerRefundNo)) {
        return { outcome: 'invalid_status' };
      }
      if (input.providerRefundNo) {
        refund.providerRefundNo = input.providerRefundNo;
        attempt.providerRefundNo = input.providerRefundNo;
        await manager.getRepository(OrderRefundEntity).save(refund);
        await manager.getRepository(OrderRefundAttemptEntity).save(attempt);
      }
      return this.bundle('recorded', order, refund);
    });
  }

  complete(input: CompleteOrderRefundInput): Promise<CompleteOrderRefundResult> {
    return this.dataSource.transaction(async (manager) => {
      const lookup = await manager.getRepository(OrderRefundEntity).findOne({
        where: { id: input.refundId, tenantId: input.tenantId },
      });
      if (!lookup) {
        return { outcome: 'not_found' };
      }
      const order = await this.lockOrder(manager, input.tenantId, lookup.orderId);
      if (!order) {
        return { outcome: 'not_found' };
      }
      const refund = await this.lockRefundByOrder(manager, input.tenantId, order.id);
      if (!refund || refund.id !== input.refundId) {
        return { outcome: 'not_found' };
      }
      if (refund.status === OrderRefundStatus.Succeeded && order.status === OrderStatus.Refunded) {
        return this.bundle('already_completed', order, refund);
      }
      if (
        order.status !== OrderStatus.RefundReviewing ||
        (refund.status !== OrderRefundStatus.Processing &&
          refund.status !== OrderRefundStatus.Failed)
      ) {
        return { outcome: 'invalid_status' };
      }
      const channelAttempt = this.requiresChannelAttempt(refund)
        ? await this.lockAttempt(manager, refund, input.channelRefundNo)
        : null;
      if (
        this.requiresChannelAttempt(refund) &&
        (refund.channelRefundNo !== input.channelRefundNo ||
          !channelAttempt ||
          this.hasProviderRefundNoConflict(refund, channelAttempt, input.providerRefundNo))
      ) {
        return { outcome: 'invalid_status' };
      }

      if (refund.paymentMethod === OrderPaymentMethod.Balance && refund.amountFen > 0) {
        const adjusted = await this.wallets.adjust(manager, {
          tenantId: order.tenantId,
          userId: order.userId,
          amountFen: refund.amountFen,
          direction: FundDirection.In,
          type: WalletTxnType.OrderRefund,
          remark: `订单退款：${order.orderNo}`,
          bizOrderId: order.id,
          createIfMissing: true,
        });
        if (adjusted.outcome !== 'adjusted') {
          throw new Error('订单退款入账失败');
        }
      }
      await this.productSales.rollback(manager, {
        tenantId: order.tenantId,
        productId: order.productId,
        quantity: order.quantity,
      });
      if (order.memberSpendRecorded) {
        await this.memberSpend.rollback(manager, {
          tenantId: order.tenantId,
          userId: order.userId,
          amountFen: order.amountFen,
        });
        order.memberSpendRecorded = false;
      }

      order.status = OrderStatus.Refunded;
      refund.status = OrderRefundStatus.Succeeded;
      refund.providerRefundNo = input.providerRefundNo || refund.providerRefundNo;
      refund.failReason = '';
      const refundedAt = new Date();
      refund.refundedAt = refundedAt;
      if (channelAttempt) {
        channelAttempt.providerRefundNo = refund.providerRefundNo;
        channelAttempt.status = OrderRefundStatus.Succeeded;
        channelAttempt.failReason = '';
        channelAttempt.finishedAt = refundedAt;
      }
      const savedOrder = await manager.getRepository(OrderEntity).save(order);
      const savedRefund = await manager.getRepository(OrderRefundEntity).save(refund);
      if (channelAttempt) {
        await manager.getRepository(OrderRefundAttemptEntity).save(channelAttempt);
      }
      return this.bundle('completed', savedOrder, savedRefund);
    });
  }

  fail(input: FailOrderRefundInput): Promise<OrderRefundBundle | null> {
    return this.dataSource.transaction(async (manager) => {
      const lookup = await manager.getRepository(OrderRefundEntity).findOne({
        where: { id: input.refundId, tenantId: input.tenantId },
      });
      if (!lookup) {
        return null;
      }
      const order = await this.lockOrder(manager, input.tenantId, lookup.orderId);
      if (!order) {
        return null;
      }
      const refund = await this.lockRefundByOrder(manager, input.tenantId, order.id);
      if (
        !refund ||
        refund.status !== OrderRefundStatus.Processing ||
        refund.channelRefundNo !== input.channelRefundNo
      ) {
        return null;
      }
      const attempt = await this.lockAttempt(manager, refund, input.channelRefundNo);
      if (!attempt || this.hasProviderRefundNoConflict(refund, attempt, input.providerRefundNo)) {
        return null;
      }
      const failedAt = new Date();
      refund.status = OrderRefundStatus.Failed;
      refund.providerRefundNo = input.providerRefundNo || refund.providerRefundNo;
      refund.failReason = input.reason.slice(0, 500);
      attempt.providerRefundNo = refund.providerRefundNo;
      attempt.status = OrderRefundStatus.Failed;
      attempt.failReason = refund.failReason;
      attempt.finishedAt = failedAt;
      const saved = await manager.getRepository(OrderRefundEntity).save(refund);
      await manager.getRepository(OrderRefundAttemptEntity).save(attempt);
      return { order: this.attachRefund(order, saved), refund: saved };
    });
  }

  private lockOrder(
    manager: EntityManager,
    tenantId: string,
    orderId: string,
  ): Promise<OrderEntity | null> {
    return manager.getRepository(OrderEntity).findOne({
      where: { id: orderId, tenantId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private lockRefundByOrder(
    manager: EntityManager,
    tenantId: string,
    orderId: string,
  ): Promise<OrderRefundEntity | null> {
    return manager.getRepository(OrderRefundEntity).findOne({
      where: { orderId, tenantId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private lockAttempt(
    manager: EntityManager,
    refund: OrderRefundEntity,
    channelRefundNo: string,
  ): Promise<OrderRefundAttemptEntity | null> {
    return manager.getRepository(OrderRefundAttemptEntity).findOne({
      where: {
        tenantId: refund.tenantId,
        refundId: refund.id,
        attempt: refund.attempt,
        channelRefundNo,
      },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private requiresChannelAttempt(refund: OrderRefundEntity): boolean {
    return refund.amountFen > 0 && refund.paymentMethod !== OrderPaymentMethod.Balance;
  }

  private hasProviderRefundNoConflict(
    refund: OrderRefundEntity,
    attempt: OrderRefundAttemptEntity,
    providerRefundNo: string,
  ): boolean {
    const knownProviderRefundNo = refund.providerRefundNo || attempt.providerRefundNo;
    return (
      (refund.providerRefundNo !== '' &&
        attempt.providerRefundNo !== '' &&
        refund.providerRefundNo !== attempt.providerRefundNo) ||
      (providerRefundNo !== '' &&
        knownProviderRefundNo !== '' &&
        providerRefundNo !== knownProviderRefundNo)
    );
  }

  private bundle<T extends string>(
    outcome: T,
    order: OrderEntity,
    refund: OrderRefundEntity,
  ): { outcome: T } & OrderRefundBundle {
    return { outcome, order: this.attachRefund(order, refund), refund };
  }

  private attachRefund(order: OrderEntity, refund: OrderRefundEntity): OrderEntity {
    order.refund = refund;
    return order;
  }
}
