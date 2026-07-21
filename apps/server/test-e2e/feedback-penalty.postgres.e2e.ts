import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';
import {
  BoosterStatus,
  FeedbackStatus,
  FeedbackType,
  FundDirection,
  OrderPaymentMethod,
  OrderStatus,
  PenaltySource,
  WalletStatus,
  WalletTxnType,
  type CreateFeedbackPenaltyBody,
} from '@app/contracts';
import { DataSource, type EntityManager, type QueryRunner } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { BoosterApplicationEntity } from '../src/modules/booster/domain/booster-application.entity';
import { BoosterPenaltyEntity } from '../src/modules/booster/domain/booster-penalty.entity';
import { TypeormBoosterFeedbackPenaltyTransaction } from '../src/modules/booster/infrastructure/booster-feedback-penalty.transaction';
import { TypeormBoosterFinanceSettlement } from '../src/modules/booster/infrastructure/booster-finance.settlement';
import { TypeormBoosterRepository } from '../src/modules/booster/infrastructure/booster.repository';
import { FeedbackEntity } from '../src/modules/feedback/domain/feedback.entity';
import { TypeormFeedbackPenaltySettlement } from '../src/modules/feedback/infrastructure/feedback-penalty.settlement';
import { OrderEntity } from '../src/modules/order/domain/order.entity';
import { TypeormOrderFeedbackPenaltyTransaction } from '../src/modules/order/infrastructure/order-feedback-penalty.transaction';
import { WalletEntity } from '../src/modules/wallet/domain/wallet.entity';
import { WalletTransactionEntity } from '../src/modules/wallet/domain/wallet-transaction.entity';
import {
  TypeormWalletTransactionParticipant,
  type AdjustWalletTransactionInput,
  type AdjustWalletTransactionResult,
  type WalletTransactionParticipant,
} from '../src/modules/wallet/infrastructure/wallet-transaction.participant';
import { TenantContextService } from '../src/shared/tenant/tenant-context.service';

const TENANT_ID = 'tenant-feedback-e2e';
const CUSTOMER_ID = 'customer-feedback-e2e';
const BOOSTER_USER_ID = 'booster-feedback-e2e';
const ORDER_ID = '00000000-0000-4000-8000-000000000001';
const FEEDBACK_ID = '00000000-0000-4000-8000-000000000002';
const schema = `feedback_penalty_e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
const entities = [
  BoosterApplicationEntity,
  BoosterPenaltyEntity,
  FeedbackEntity,
  OrderEntity,
  WalletEntity,
  WalletTransactionEntity,
];

const penaltyPayload: CreateFeedbackPenaltyBody = {
  amountFen: 300,
  source: PenaltySource.Balance,
  reason: '服务质量未达标',
  replyContent: '投诉成立，已完成扣款。',
};

let adminDataSource: DataSource;
let dataSource: DataSource;
let tenant: TenantContextService;
let walletTransaction: TypeormWalletTransactionParticipant;
let boosterTransaction: TypeormBoosterFeedbackPenaltyTransaction;

before(async () => {
  const env = loadEnvConfig();
  const connection = {
    type: 'postgres' as const,
    host: env.database.host,
    port: env.database.port,
    username: env.database.user,
    password: env.database.password,
    database: env.database.name,
  };
  adminDataSource = await new DataSource(connection).initialize();
  await adminDataSource.query(`CREATE SCHEMA "${schema}"`);
  dataSource = await new DataSource({
    ...connection,
    schema,
    entities,
    synchronize: true,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  }).initialize();
  tenant = new TenantContextService();
  walletTransaction = new TypeormWalletTransactionParticipant();
  boosterTransaction = new TypeormBoosterFeedbackPenaltyTransaction();
});

beforeEach(async () => {
  await dataSource.query(
    `TRUNCATE TABLE
      "${schema}"."feedback",
      "${schema}"."service_order",
      "${schema}"."booster_penalty",
      "${schema}"."wallet_transaction",
      "${schema}"."wallet",
      "${schema}"."booster_application"
    CASCADE`,
  );
});

after(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
  if (adminDataSource?.isInitialized) {
    await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await adminDataSource.destroy();
  }
});

test('相同反馈的真实并发请求只扣款并记账一次', async () => {
  const { feedback, wallet } = await seedFeedbackScenario();
  const settlement = createFeedbackSettlement();
  const blocker = await lockEntityRow((manager) =>
    manager.getRepository(FeedbackEntity).findOne({
      where: { id: feedback.id },
      lock: { mode: 'pessimistic_write' },
    }),
  );
  try {
    const requests = [settlement.settle(settlementInput()), settlement.settle(settlementInput())];
    assert.equal(await waitForBlockedTransaction(blocker.pid), true);
    await blocker.runner.commitTransaction();

    const results = await Promise.all(requests);
    const savedWallet = await dataSource.getRepository(WalletEntity).findOneByOrFail({
      id: wallet.id,
    });
    const savedFeedback = await dataSource.getRepository(FeedbackEntity).findOneByOrFail({
      id: feedback.id,
    });
    assert.equal(savedWallet.balanceFen, 700);
    assert.equal(await dataSource.getRepository(WalletTransactionEntity).count(), 1);
    assert.equal(await dataSource.getRepository(BoosterPenaltyEntity).count(), 1);
    assert.equal(savedFeedback.status, FeedbackStatus.Resolved);
    assert.ok(savedFeedback.penaltyId);
    assert.equal(results[0].penaltyId, results[1].penaltyId);
  } finally {
    await releaseRunner(blocker.runner);
  }
});

test('旧资料快照保存不会恢复已扣除的押金', async () => {
  const booster = await seedBooster(1_000);
  const repository = new TypeormBoosterRepository(
    dataSource.getRepository(BoosterApplicationEntity),
    tenant,
  );
  const stale = await inTenant(() => repository.findByUserId(BOOSTER_USER_ID));
  assert.ok(stale);

  const deducted = await dataSource.transaction((manager) =>
    boosterTransaction.deductDeposit(manager, {
      tenantId: TENANT_ID,
      boosterUserId: BOOSTER_USER_ID,
      amountFen: 300,
    }),
  );
  assert.equal(deducted.outcome, 'deducted');
  stale.voiceUrl = 'https://example.test/voice.webm';
  await inTenant(() => repository.save(stale));

  const saved = await dataSource.getRepository(BoosterApplicationEntity).findOneByOrFail({
    id: booster.id,
  });
  assert.equal(saved.depositFen, 700);
  assert.equal(saved.voiceUrl, stale.voiceUrl);
});

test('缴押金持锁时处罚等待，提交后资金与流水守恒', async () => {
  const booster = await seedBooster(1_000);
  const wallet = await seedWallet(1_000);
  const blockingWallet = new BlockingWalletParticipant(walletTransaction);
  const finance = new TypeormBoosterFinanceSettlement(dataSource, tenant, blockingWallet);

  const payPromise = inTenant(() =>
    finance.payDeposit({ userId: BOOSTER_USER_ID, amountFen: 200, maxFen: 2_000 }),
  );
  await blockingWallet.waitUntilBoosterLocked();
  const penaltyPromise = dataSource.transaction((manager) =>
    boosterTransaction.deductDeposit(manager, {
      tenantId: TENANT_ID,
      boosterUserId: BOOSTER_USER_ID,
      amountFen: 300,
    }),
  );
  try {
    assert.equal(await waitForBlockedTransaction(blockingWallet.backendPid), true);
  } finally {
    blockingWallet.release();
  }

  const [payResult, penaltyResult] = await Promise.all([payPromise, penaltyPromise]);
  assert.equal(payResult.outcome, 'paid');
  assert.equal(penaltyResult.outcome, 'deducted');
  const savedBooster = await dataSource.getRepository(BoosterApplicationEntity).findOneByOrFail({
    id: booster.id,
  });
  const savedWallet = await dataSource.getRepository(WalletEntity).findOneByOrFail({
    id: wallet.id,
  });
  assert.equal(savedBooster.depositFen, 900);
  assert.equal(savedWallet.balanceFen, 800);
  assert.equal(await dataSource.getRepository(WalletTransactionEntity).count(), 1);
});

test('处罚先持锁时退款等待且只退处罚后的押金', async () => {
  const booster = await seedBooster(1_000);
  const finance = new TypeormBoosterFinanceSettlement(dataSource, tenant, walletTransaction);
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  const pid = await backendPid(runner.manager);
  try {
    const penaltyResult = await boosterTransaction.deductDeposit(runner.manager, {
      tenantId: TENANT_ID,
      boosterUserId: BOOSTER_USER_ID,
      amountFen: 300,
    });
    assert.equal(penaltyResult.outcome, 'deducted');
    const refundPromise = inTenant(() => finance.refundDeposit(booster.id));
    assert.equal(await waitForBlockedTransaction(pid), true);
    await runner.commitTransaction();

    const refundResult = await refundPromise;
    assert.equal(refundResult.outcome, 'refunded');
    if (refundResult.outcome === 'refunded') {
      assert.equal(refundResult.amountFen, 700);
    }
    const savedBooster = await dataSource
      .getRepository(BoosterApplicationEntity)
      .findOneByOrFail({ id: booster.id });
    const savedWallet = await dataSource.getRepository(WalletEntity).findOneByOrFail({
      tenantId: TENANT_ID,
      userId: BOOSTER_USER_ID,
    });
    assert.equal(savedBooster.depositFen, 0);
    assert.equal(savedWallet.balanceFen, 700);
  } finally {
    await releaseRunner(runner);
  }
});

test('完成单数与处罚并发时递增不丢失且不覆盖押金', async () => {
  const booster = await seedBooster(1_000);
  const repository = new TypeormBoosterRepository(
    dataSource.getRepository(BoosterApplicationEntity),
    tenant,
  );
  const blocker = await lockEntityRow((manager) =>
    manager.getRepository(BoosterApplicationEntity).findOne({
      where: { id: booster.id },
      lock: { mode: 'pessimistic_write' },
    }),
  );
  try {
    const completions = Array.from({ length: 10 }, () =>
      inTenant(() => repository.recordCompletedOrder(BOOSTER_USER_ID)),
    );
    assert.equal(await waitForBlockedTransaction(blocker.pid), true);
    const penaltyResult = await boosterTransaction.deductDeposit(blocker.runner.manager, {
      tenantId: TENANT_ID,
      boosterUserId: BOOSTER_USER_ID,
      amountFen: 300,
    });
    assert.equal(penaltyResult.outcome, 'deducted');
    await blocker.runner.commitTransaction();

    const previousCounts = await Promise.all(completions);
    assert.deepEqual(
      previousCounts.sort((left, right) => (left ?? 0) - (right ?? 0)),
      Array.from({ length: 10 }, (_, index) => index),
    );
    const saved = await dataSource.getRepository(BoosterApplicationEntity).findOneByOrFail({
      id: booster.id,
    });
    assert.equal(saved.completedOrders, 10);
    assert.equal(saved.depositFen, 700);
  } finally {
    await releaseRunner(blocker.runner);
  }
});

class BlockingWalletParticipant implements WalletTransactionParticipant {
  private readonly locked: Promise<void>;
  private readonly released: Promise<void>;
  private resolveLocked: () => void = () => undefined;
  private resolveReleased: () => void = () => undefined;
  backendPid = 0;

  constructor(private readonly delegate: WalletTransactionParticipant) {
    this.locked = new Promise((resolve) => {
      this.resolveLocked = resolve;
    });
    this.released = new Promise((resolve) => {
      this.resolveReleased = resolve;
    });
  }

  async adjust(
    manager: EntityManager,
    input: AdjustWalletTransactionInput,
  ): Promise<AdjustWalletTransactionResult> {
    this.backendPid = await backendPid(manager);
    this.resolveLocked();
    await this.released;
    return this.delegate.adjust(manager, input);
  }

  waitUntilBoosterLocked(): Promise<void> {
    return this.locked;
  }

  release(): void {
    this.resolveReleased();
  }
}

function inTenant<T>(work: () => Promise<T>): Promise<T> {
  return tenant.run({ tenantId: TENANT_ID, isSuper: false }, work);
}

function createFeedbackSettlement(): TypeormFeedbackPenaltySettlement {
  return new TypeormFeedbackPenaltySettlement(
    dataSource,
    new TypeormOrderFeedbackPenaltyTransaction(),
    walletTransaction,
    boosterTransaction,
  );
}

function settlementInput() {
  return {
    feedbackId: FEEDBACK_ID,
    operatorId: 'operator-e2e',
    scopeTenantId: TENANT_ID,
    payload: penaltyPayload,
  };
}

async function seedFeedbackScenario(): Promise<{
  feedback: FeedbackEntity;
  wallet: WalletEntity;
}> {
  await seedBooster(1_000);
  const wallet = await seedWallet(1_000);
  const orderRepository = dataSource.getRepository(OrderEntity);
  await orderRepository.save(
    orderRepository.create({
      id: ORDER_ID,
      tenantId: TENANT_ID,
      userId: CUSTOMER_ID,
      orderNo: 'ORDER-E2E',
      productId: 'product-e2e',
      productTitle: '并发测试订单',
      boosterId: BOOSTER_USER_ID,
      boosterName: '并发测试打手',
      amountFen: 1_000,
      provider: OrderPaymentMethod.Balance,
      status: OrderStatus.Serving,
    }),
  );
  const feedbackRepository = dataSource.getRepository(FeedbackEntity);
  const feedback = await feedbackRepository.save(
    feedbackRepository.create({
      id: FEEDBACK_ID,
      tenantId: TENANT_ID,
      userId: CUSTOMER_ID,
      type: FeedbackType.Booster,
      target: 'ORDER-E2E',
      orderId: ORDER_ID,
      orderNo: 'ORDER-E2E',
      boosterUserId: BOOSTER_USER_ID,
      boosterName: '并发测试打手',
      penaltyId: null,
      content: '服务质量不符合要求',
      status: FeedbackStatus.Pending,
    }),
  );
  return { feedback, wallet };
}

function seedBooster(depositFen: number): Promise<BoosterApplicationEntity> {
  const repository = dataSource.getRepository(BoosterApplicationEntity);
  return repository.save(
    repository.create({
      tenantId: TENANT_ID,
      userId: BOOSTER_USER_ID,
      applicantName: '并发测试打手',
      intro: 'PostgreSQL concurrency e2e',
      status: BoosterStatus.Approved,
      completedOrders: 0,
      depositFen,
    }),
  );
}

function seedWallet(balanceFen: number): Promise<WalletEntity> {
  const repository = dataSource.getRepository(WalletEntity);
  return repository.save(
    repository.create({
      tenantId: TENANT_ID,
      userId: BOOSTER_USER_ID,
      balanceFen,
      totalRechargeFen: 0,
      totalWithdrawFen: 0,
      status: WalletStatus.Active,
    }),
  );
}

async function lockEntityRow(
  lock: (manager: EntityManager) => Promise<unknown>,
): Promise<{ runner: QueryRunner; pid: number }> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  await lock(runner.manager);
  return { runner, pid: await backendPid(runner.manager) };
}

async function backendPid(manager: EntityManager): Promise<number> {
  const row = await manager
    .createQueryBuilder()
    .select('pg_backend_pid()', 'pid')
    .from('pg_catalog.pg_database', 'database')
    .limit(1)
    .getRawOne<{ pid: number }>();
  if (!row) {
    throw new Error('无法读取 PostgreSQL backend pid');
  }
  return Number(row.pid);
}

async function waitForBlockedTransaction(blockerPid: number): Promise<boolean> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const row = await adminDataSource
      .createQueryBuilder()
      .select(
        `EXISTS (
          SELECT 1
          FROM pg_stat_activity AS activity
          WHERE :blockerPid = ANY(pg_blocking_pids(activity.pid))
        )`,
        'blocked',
      )
      .from('pg_catalog.pg_database', 'database')
      .limit(1)
      .setParameter('blockerPid', blockerPid)
      .getRawOne<{ blocked: boolean }>();
    if (row?.blocked) {
      return true;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  return false;
}

async function releaseRunner(runner: QueryRunner): Promise<void> {
  if (runner.isTransactionActive) {
    await runner.rollbackTransaction();
  }
  if (!runner.isReleased) {
    await runner.release();
  }
}
