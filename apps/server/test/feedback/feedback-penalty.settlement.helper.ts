import {
  FeedbackStatus,
  FeedbackType,
  OrderPaymentMethod,
  OrderStatus,
  PenaltySource,
  WalletStatus,
  type CreateFeedbackPenaltyBody,
} from '@app/contracts';
import type { DataSource, EntityManager } from 'typeorm';
import { BoosterApplicationEntity } from '../../src/modules/booster/domain/booster-application.entity';
import { BoosterPenaltyEntity } from '../../src/modules/booster/domain/booster-penalty.entity';
import { TypeormBoosterFeedbackPenaltyTransaction } from '../../src/modules/booster/infrastructure/booster-feedback-penalty.transaction';
import { FeedbackEntity } from '../../src/modules/feedback/domain/feedback.entity';
import { TypeormFeedbackPenaltySettlement } from '../../src/modules/feedback/infrastructure/feedback-penalty.settlement';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';
import { TypeormOrderFeedbackPenaltyTransaction } from '../../src/modules/order/infrastructure/order-feedback-penalty.transaction';
import { WalletEntity } from '../../src/modules/wallet/domain/wallet.entity';
import { WalletTransactionEntity } from '../../src/modules/wallet/domain/wallet-transaction.entity';
import { TypeormWalletTransactionParticipant } from '../../src/modules/wallet/infrastructure/wallet-transaction.participant';

interface FindRequest<T> {
  where: Partial<T>;
  lock?: { mode: string };
}

interface SettlementState {
  feedbacks: FeedbackEntity[];
  orders: OrderEntity[];
  wallets?: WalletEntity[];
  boosters?: BoosterApplicationEntity[];
}

export class FeedbackPenaltyHarness {
  readonly penalties: BoosterPenaltyEntity[] = [];
  readonly transactions: WalletTransactionEntity[] = [];
  readonly locks: string[] = [];
  readonly dataSource: DataSource;
  private queue: Promise<void> = Promise.resolve();
  private nextPenaltyId = 1;
  private nextTransactionId = 1;

  constructor(readonly state: SettlementState) {
    const manager = {
      getRepository: (target: unknown) => this.repositoryFor(target),
    } as unknown as EntityManager;
    this.dataSource = {
      transaction: <T>(work: (entityManager: EntityManager) => Promise<T>) =>
        this.serialized(() => this.withRollback(() => work(manager))),
    } as unknown as DataSource;
  }

  private async serialized<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release = (): void => undefined;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }

  private async withRollback<T>(work: () => Promise<T>): Promise<T> {
    const feedbackSnapshots = this.state.feedbacks.map((feedback) => ({
      feedback,
      status: feedback.status,
      replyContent: feedback.replyContent,
      handledBy: feedback.handledBy,
      handledAt: feedback.handledAt,
      penaltyId: feedback.penaltyId,
    }));
    const walletSnapshots = (this.state.wallets ?? []).map((wallet) => ({
      wallet,
      balanceFen: wallet.balanceFen,
    }));
    const boosterSnapshots = (this.state.boosters ?? []).map((booster) => ({
      booster,
      depositFen: booster.depositFen,
    }));
    const penaltyCount = this.penalties.length;
    const transactionCount = this.transactions.length;

    try {
      return await work();
    } catch (error) {
      for (const snapshot of feedbackSnapshots) {
        Object.assign(snapshot.feedback, {
          status: snapshot.status,
          replyContent: snapshot.replyContent,
          handledBy: snapshot.handledBy,
          handledAt: snapshot.handledAt,
          penaltyId: snapshot.penaltyId,
        });
      }
      for (const snapshot of walletSnapshots) {
        snapshot.wallet.balanceFen = snapshot.balanceFen;
      }
      for (const snapshot of boosterSnapshots) {
        snapshot.booster.depositFen = snapshot.depositFen;
      }
      this.penalties.splice(penaltyCount);
      this.transactions.splice(transactionCount);
      throw error;
    }
  }

  private matches<T extends object>(entity: T, where: Partial<T>): boolean {
    return Object.entries(where).every(([key, value]) => entity[key as keyof T] === value);
  }

  private findOne<T extends object>(
    entities: T[],
    request: FindRequest<T>,
    lockTarget?: string,
  ): T | null {
    if (request.lock && lockTarget) {
      this.locks.push(lockTarget);
    }
    return entities.find((entity) => this.matches(entity, request.where)) ?? null;
  }

  private repositoryFor(target: unknown): unknown {
    if (target === FeedbackEntity) {
      return {
        findOne: async (request: FindRequest<FeedbackEntity>) =>
          this.findOne(this.state.feedbacks, request, 'feedback'),
        save: async (feedback: FeedbackEntity) => feedback,
      };
    }
    if (target === OrderEntity) {
      return {
        findOne: async (request: FindRequest<OrderEntity>) =>
          this.findOne(this.state.orders, request, 'order'),
      };
    }
    if (target === WalletEntity) {
      return {
        findOne: async (request: FindRequest<WalletEntity>) =>
          this.findOne(this.state.wallets ?? [], request, 'wallet'),
        save: async (wallet: WalletEntity) => wallet,
      };
    }
    if (target === BoosterApplicationEntity) {
      return {
        findOne: async (request: FindRequest<BoosterApplicationEntity>) =>
          this.findOne(this.state.boosters ?? [], request, 'booster'),
        save: async (booster: BoosterApplicationEntity) => booster,
        update: async (
          where: Partial<BoosterApplicationEntity>,
          patch: Partial<BoosterApplicationEntity>,
        ) => {
          const booster = (this.state.boosters ?? []).find((candidate) =>
            this.matches(candidate, where),
          );
          if (booster) {
            Object.assign(booster, patch);
          }
          return { affected: booster ? 1 : 0 };
        },
      };
    }
    if (target === BoosterPenaltyEntity) {
      return {
        findOne: async (request: FindRequest<BoosterPenaltyEntity>) =>
          this.findOne(this.penalties, request),
        create: (data: Partial<BoosterPenaltyEntity>) =>
          Object.assign(new BoosterPenaltyEntity(), data),
        save: async (penalty: BoosterPenaltyEntity) => {
          penalty.id = `penalty-${this.nextPenaltyId++}`;
          this.penalties.push(penalty);
          return penalty;
        },
      };
    }
    if (target === WalletTransactionEntity) {
      return {
        create: (data: Partial<WalletTransactionEntity>) =>
          Object.assign(new WalletTransactionEntity(), data),
        save: async (transaction: WalletTransactionEntity) => {
          transaction.id = `transaction-${this.nextTransactionId++}`;
          this.transactions.push(transaction);
          return transaction;
        },
      };
    }
    throw new Error('unexpected repository target');
  }
}

export const balanceRequest: CreateFeedbackPenaltyBody = {
  amountFen: 300,
  source: PenaltySource.Balance,
  reason: ' 服务质量未达标 ',
  replyContent: ' 投诉成立，已完成扣款。 ',
};

export function makeFeedback(overrides: Partial<FeedbackEntity> = {}): FeedbackEntity {
  return Object.assign(new FeedbackEntity(), {
    id: 'feedback-1',
    tenantId: 'tenant-1',
    userId: 'customer-1',
    type: FeedbackType.Booster,
    target: 'ORDER-1',
    orderId: 'order-1',
    orderNo: 'ORDER-1',
    boosterUserId: 'booster-1',
    boosterName: '打手甲',
    penaltyId: null,
    content: '服务质量不符合要求',
    status: FeedbackStatus.Pending,
    replyContent: '',
    handledBy: '',
    handledAt: null,
    ...overrides,
  });
}

export function makeOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
  return Object.assign(new OrderEntity(), {
    id: 'order-1',
    tenantId: 'tenant-1',
    userId: 'customer-1',
    orderNo: 'ORDER-1',
    boosterId: 'booster-1',
    boosterName: '打手甲',
    provider: OrderPaymentMethod.Balance,
    status: OrderStatus.Serving,
    ...overrides,
  });
}

export function makeWallet(
  balanceFen: number,
  overrides: Partial<WalletEntity> = {},
): WalletEntity {
  return Object.assign(new WalletEntity(), {
    id: 'wallet-1',
    tenantId: 'tenant-1',
    userId: 'booster-1',
    balanceFen,
    totalRechargeFen: 0,
    totalWithdrawFen: 0,
    status: WalletStatus.Active,
    ...overrides,
  });
}

export function makeBooster(
  depositFen: number,
  overrides: Partial<BoosterApplicationEntity> = {},
): BoosterApplicationEntity {
  return Object.assign(new BoosterApplicationEntity(), {
    id: 'booster-application-1',
    tenantId: 'tenant-1',
    userId: 'booster-1',
    depositFen,
    ...overrides,
  });
}

export function settle(
  harness: FeedbackPenaltyHarness,
  payload: CreateFeedbackPenaltyBody = balanceRequest,
): Promise<FeedbackEntity> {
  return new TypeormFeedbackPenaltySettlement(
    harness.dataSource,
    new TypeormOrderFeedbackPenaltyTransaction(),
    new TypeormWalletTransactionParticipant(),
    new TypeormBoosterFeedbackPenaltyTransaction(),
  ).settle({
    feedbackId: 'feedback-1',
    operatorId: 'operator-1',
    scopeTenantId: 'tenant-1',
    payload,
  });
}
