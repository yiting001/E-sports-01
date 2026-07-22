import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FundDirection,
  OrderPaymentMethod,
  OrderStatus,
  WalletStatus,
  WalletTxnType,
} from '@app/contracts';
import type { DataSource, EntityManager } from 'typeorm';
import { ProductEntity } from '../../src/modules/commerce/domain/product.entity';
import type { MemberSpendTransactionParticipant } from '../../src/modules/member/infrastructure/member-spend-transaction.participant';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';
import { TypeormOrderPaymentSettlement } from '../../src/modules/order/infrastructure/order-payment.settlement';
import { WalletEntity } from '../../src/modules/wallet/domain/wallet.entity';
import { WalletTransactionEntity } from '../../src/modules/wallet/domain/wallet-transaction.entity';

interface FindRequest<T> {
  where: Partial<T>;
  lock?: { mode: string };
}

class SettlementHarness {
  readonly transactions: WalletTransactionEntity[] = [];
  readonly lockTargets: string[] = [];
  readonly walletLookupCriteria: Partial<WalletEntity>[] = [];
  readonly soldByProduct = new Map<string, number>();
  readonly memberSpendByUser = new Map<string, number>();
  readonly dataSource: DataSource;
  readonly memberSpend: MemberSpendTransactionParticipant;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    readonly orders: OrderEntity[],
    readonly wallet: WalletEntity | null,
  ) {
    const manager = {
      getRepository: (target: unknown) => this.repositoryFor(target),
    } as unknown as EntityManager;
    this.dataSource = {
      transaction: <T>(work: (entityManager: EntityManager) => Promise<T>) =>
        this.serialized(() => work(manager)),
    } as unknown as DataSource;
    this.memberSpend = {
      record: async (_manager, input) => {
        this.memberSpendByUser.set(
          input.userId,
          (this.memberSpendByUser.get(input.userId) ?? 0) + input.amountFen,
        );
      },
      rollback: async (_manager, input) => {
        this.memberSpendByUser.set(
          input.userId,
          Math.max((this.memberSpendByUser.get(input.userId) ?? 0) - input.amountFen, 0),
        );
      },
    };
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

  private repositoryFor(target: unknown): unknown {
    if (target === OrderEntity) {
      return {
        findOne: async (request: FindRequest<OrderEntity>) => {
          if (request.lock) {
            this.lockTargets.push('order');
          }
          return (
            this.orders.find((order) =>
              Object.entries(request.where).every(
                ([key, value]) => order[key as keyof OrderEntity] === value,
              ),
            ) ?? null
          );
        },
        save: async (order: OrderEntity) => order,
      };
    }
    if (target === WalletEntity) {
      return {
        findOne: async (request: FindRequest<WalletEntity>) => {
          if (request.lock) {
            this.lockTargets.push('wallet');
          }
          this.walletLookupCriteria.push(request.where);
          if (!this.wallet) {
            return null;
          }
          return Object.entries(request.where).every(
            ([key, value]) => this.wallet?.[key as keyof WalletEntity] === value,
          )
            ? this.wallet
            : null;
        },
        save: async (wallet: WalletEntity) => wallet,
      };
    }
    if (target === WalletTransactionEntity) {
      return {
        create: (data: Partial<WalletTransactionEntity>) => {
          const transaction = Object.assign(new WalletTransactionEntity(), data);
          transaction.id = `transaction-${this.transactions.length + 1}`;
          return transaction;
        },
        save: async (transaction: WalletTransactionEntity) => {
          this.transactions.push(transaction);
          return transaction;
        },
      };
    }
    if (target === ProductEntity) {
      return {
        increment: async (criteria: Partial<ProductEntity>, property: string, quantity: number) => {
          assert.equal(property, 'sold');
          const productId = criteria.id ?? '';
          this.soldByProduct.set(productId, (this.soldByProduct.get(productId) ?? 0) + quantity);
          return { affected: 1 };
        },
      };
    }
    throw new Error('unexpected repository target');
  }
}

function makeOrder(
  id: string,
  amountFen: number,
  overrides: Partial<OrderEntity> = {},
): OrderEntity {
  return Object.assign(new OrderEntity(), {
    id,
    tenantId: 'tenant-1',
    userId: 'user-1',
    orderNo: `ORDER-${id}`,
    productId: 'product-1',
    productTitle: '陪玩服务',
    productCover: '',
    serviceAgentId: '',
    boosterId: '',
    boosterName: '',
    conversationId: '',
    quantity: 2,
    amountFen,
    memberSpendRecorded: false,
    provider: OrderPaymentMethod.Balance,
    status: OrderStatus.PendingPayment,
    providerTradeNo: null,
    paidAt: null,
    ...overrides,
  });
}

function makeWallet(balanceFen: number, overrides: Partial<WalletEntity> = {}): WalletEntity {
  return Object.assign(new WalletEntity(), {
    id: 'wallet-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    balanceFen,
    totalRechargeFen: 0,
    totalWithdrawFen: 0,
    status: WalletStatus.Active,
    ...overrides,
  });
}

test('余额支付同事务扣款、记流水、推进订单并累加销量与会员消费', async () => {
  const order = makeOrder('order-1', 300);
  const wallet = makeWallet(1_000);
  const harness = new SettlementHarness([order], wallet);
  const settlement = new TypeormOrderPaymentSettlement(harness.dataSource, harness.memberSpend);

  const result = await settlement.settleBalance({
    orderId: order.id,
    userId: order.userId,
    paidAmountFen: order.amountFen,
  });

  assert.equal(result, order);
  assert.equal(wallet.balanceFen, 700);
  assert.equal(order.status, OrderStatus.PendingService);
  assert.match(order.providerTradeNo ?? '', /^BALANCE-/);
  assert.ok(order.paidAt instanceof Date);
  assert.equal(harness.soldByProduct.get(order.productId), order.quantity);
  assert.equal(harness.memberSpendByUser.get(order.userId), order.amountFen);
  assert.equal(order.memberSpendRecorded, true);
  assert.deepEqual(harness.lockTargets, ['order', 'wallet']);
  assert.deepEqual(harness.walletLookupCriteria, [
    { tenantId: order.tenantId, userId: order.userId },
  ]);
  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.transactions[0]?.type, WalletTxnType.OrderPayment);
  assert.equal(harness.transactions[0]?.direction, FundDirection.Out);
  assert.equal(harness.transactions[0]?.balanceAfterFen, 700);
  assert.equal(harness.transactions[0]?.bizOrderId, order.id);
});

test('余额冻结或不足时不修改订单、余额和流水', async (t) => {
  await t.test('冻结钱包', async () => {
    const order = makeOrder('order-frozen', 300);
    const wallet = makeWallet(1_000, { status: WalletStatus.Frozen });
    const harness = new SettlementHarness([order], wallet);
    const settlement = new TypeormOrderPaymentSettlement(harness.dataSource, harness.memberSpend);

    await assert.rejects(
      settlement.settleBalance({
        orderId: order.id,
        userId: order.userId,
        paidAmountFen: order.amountFen,
      }),
      /钱包已冻结/,
    );
    assert.equal(wallet.balanceFen, 1_000);
    assert.equal(order.status, OrderStatus.PendingPayment);
    assert.equal(harness.transactions.length, 0);
  });

  await t.test('余额不足', async () => {
    const order = makeOrder('order-insufficient', 300);
    const wallet = makeWallet(299);
    const harness = new SettlementHarness([order], wallet);
    const settlement = new TypeormOrderPaymentSettlement(harness.dataSource, harness.memberSpend);

    await assert.rejects(
      settlement.settleBalance({
        orderId: order.id,
        userId: order.userId,
        paidAmountFen: order.amountFen,
      }),
      /钱包余额不足/,
    );
    assert.equal(wallet.balanceFen, 299);
    assert.equal(order.status, OrderStatus.PendingPayment);
    assert.equal(harness.transactions.length, 0);
  });
});

test('余额支付拒绝越权用户和不一致金额', async (t) => {
  await t.test('非订单本人', async () => {
    const order = makeOrder('order-owner', 300);
    const wallet = makeWallet(1_000);
    const harness = new SettlementHarness([order], wallet);
    const settlement = new TypeormOrderPaymentSettlement(harness.dataSource, harness.memberSpend);

    await assert.rejects(
      settlement.settleBalance({
        orderId: order.id,
        userId: 'another-user',
        paidAmountFen: order.amountFen,
      }),
      /订单不存在/,
    );
    assert.equal(wallet.balanceFen, 1_000);
    assert.deepEqual(harness.lockTargets, ['order']);
  });

  await t.test('支付金额不一致', async () => {
    const order = makeOrder('order-amount', 300);
    const wallet = makeWallet(1_000);
    const harness = new SettlementHarness([order], wallet);
    const settlement = new TypeormOrderPaymentSettlement(harness.dataSource, harness.memberSpend);

    await assert.rejects(
      settlement.settleBalance({
        orderId: order.id,
        userId: order.userId,
        paidAmountFen: 299,
      }),
      /订单支付金额不匹配/,
    );
    assert.equal(wallet.balanceFen, 1_000);
    assert.deepEqual(harness.lockTargets, ['order']);
  });
});

test('同一订单并发余额支付仅扣款一次', async () => {
  const order = makeOrder('order-concurrent', 200);
  const wallet = makeWallet(500);
  const harness = new SettlementHarness([order], wallet);
  const settlement = new TypeormOrderPaymentSettlement(harness.dataSource, harness.memberSpend);
  const input = {
    orderId: order.id,
    userId: order.userId,
    paidAmountFen: order.amountFen,
  };

  const results = await Promise.all([
    settlement.settleBalance(input),
    settlement.settleBalance(input),
  ]);

  assert.equal(results.filter((result) => result !== null).length, 1);
  assert.equal(wallet.balanceFen, 300);
  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.soldByProduct.get(order.productId), order.quantity);
  assert.equal(harness.memberSpendByUser.get(order.userId), order.amountFen);
});

test('同钱包不同订单并发时余额不会透支', async () => {
  const first = makeOrder('order-a', 100);
  const second = makeOrder('order-b', 100);
  const wallet = makeWallet(150);
  const harness = new SettlementHarness([first, second], wallet);
  const settlement = new TypeormOrderPaymentSettlement(harness.dataSource, harness.memberSpend);

  const results = await Promise.allSettled(
    [first, second].map((order) =>
      settlement.settleBalance({
        orderId: order.id,
        userId: order.userId,
        paidAmountFen: order.amountFen,
      }),
    ),
  );

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(wallet.balanceFen, 50);
  assert.equal(harness.transactions.length, 1);
  assert.equal(
    [first, second].filter((order) => order.status === OrderStatus.PendingService).length,
    1,
  );
});

test('0 元余额订单直接落账且不产生钱包流水', async () => {
  const order = makeOrder('order-zero', 0);
  const harness = new SettlementHarness([order], null);
  const settlement = new TypeormOrderPaymentSettlement(harness.dataSource, harness.memberSpend);

  const result = await settlement.settle({
    orderNo: order.orderNo,
    method: OrderPaymentMethod.Balance,
    providerTradeNo: 'ZERO_AMOUNT',
    paidAmountFen: 0,
  });

  assert.equal(result, order);
  assert.equal(order.status, OrderStatus.PendingService);
  assert.equal(order.providerTradeNo, 'ZERO_AMOUNT');
  assert.equal(order.memberSpendRecorded, false);
  assert.equal(harness.memberSpendByUser.has(order.userId), false);
  assert.equal(harness.transactions.length, 0);
  assert.deepEqual(harness.lockTargets, ['order']);
});
