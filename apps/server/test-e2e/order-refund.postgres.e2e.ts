import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';
import {
  FundDirection,
  OrderPaymentMethod,
  OrderRefundStatus,
  OrderStatus,
  ProductStatus,
  WalletStatus,
  WalletTxnType,
} from '@app/contracts';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { ProductEntity } from '../src/modules/commerce/domain/product.entity';
import { TypeormProductSalesTransactionParticipant } from '../src/modules/commerce/infrastructure/product-sales-transaction.participant';
import { MemberProfileEntity } from '../src/modules/member/domain/member-profile.entity';
import { TypeormMemberSpendTransactionParticipant } from '../src/modules/member/infrastructure/member-spend-transaction.participant';
import { OrderRefundAttemptEntity } from '../src/modules/order/domain/order-refund-attempt.entity';
import { OrderRefundEntity } from '../src/modules/order/domain/order-refund.entity';
import { OrderEntity } from '../src/modules/order/domain/order.entity';
import { TypeormOrderRefundTransaction } from '../src/modules/order/infrastructure/order-refund.transaction';
import { TypeormOrderRepository } from '../src/modules/order/infrastructure/order.repository';
import { WalletEntity } from '../src/modules/wallet/domain/wallet.entity';
import { WalletTransactionEntity } from '../src/modules/wallet/domain/wallet-transaction.entity';
import { TypeormWalletTransactionParticipant } from '../src/modules/wallet/infrastructure/wallet-transaction.participant';
import { TenantContextService } from '../src/shared/tenant/tenant-context.service';

const TENANT_ID = 'tenant-order-refund-e2e';
const USER_ID = 'user-order-refund-e2e';
const PRODUCT_ID = '00000000-0000-4000-8000-000000000201';
const schema = `order_refund_e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`;

let adminDataSource: DataSource;
let dataSource: DataSource;
let refunds: TypeormOrderRefundTransaction;
let orders: TypeormOrderRepository;
let tenant: TenantContextService;

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
    entities: [
      OrderEntity,
      OrderRefundEntity,
      OrderRefundAttemptEntity,
      ProductEntity,
      MemberProfileEntity,
      WalletEntity,
      WalletTransactionEntity,
    ],
    synchronize: true,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  }).initialize();
  refunds = new TypeormOrderRefundTransaction(
    dataSource,
    new TypeormWalletTransactionParticipant(),
    new TypeormProductSalesTransactionParticipant(),
    new TypeormMemberSpendTransactionParticipant(),
  );
  tenant = new TenantContextService();
  orders = new TypeormOrderRepository(dataSource.getRepository(OrderEntity), tenant);
});

beforeEach(async () => {
  await dataSource.query(
    `TRUNCATE TABLE
      "${schema}"."service_order_refund_attempt",
      "${schema}"."service_order_refund",
      "${schema}"."service_order",
      "${schema}"."wallet_transaction",
      "${schema}"."wallet",
      "${schema}"."member_profile",
      "${schema}"."commerce_product"
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

test('余额退款并发完成仅入账和冲正一次', async () => {
  const order = await seedScenario(OrderStatus.PendingService, OrderPaymentMethod.Balance);
  const requested = await refunds.request({
    tenantId: TENANT_ID,
    orderId: order.id,
    userId: USER_ID,
    refundNo: 'REFUND-BALANCE-E2E',
    reason: '无法继续服务',
  });
  assert.equal(requested.outcome, 'created');
  const begun = await refunds.begin({
    tenantId: TENANT_ID,
    orderId: order.id,
    reviewerId: 'reviewer-e2e',
    channelRefundNo: '',
  });
  assert.equal(begun.outcome, 'started');
  if (begun.outcome !== 'started') {
    return;
  }

  const results = await Promise.all([
    refunds.complete({
      tenantId: TENANT_ID,
      refundId: begun.refund.id,
      channelRefundNo: '',
      providerRefundNo: 'BALANCE-REFUND-BALANCE-E2E',
    }),
    refunds.complete({
      tenantId: TENANT_ID,
      refundId: begun.refund.id,
      channelRefundNo: '',
      providerRefundNo: 'BALANCE-REFUND-BALANCE-E2E',
    }),
  ]);

  assert.deepEqual(results.map((result) => result.outcome).sort(), [
    'already_completed',
    'completed',
  ]);
  const savedOrder = await dataSource.getRepository(OrderEntity).findOneByOrFail({ id: order.id });
  const savedRefund = await dataSource
    .getRepository(OrderRefundEntity)
    .findOneByOrFail({ orderId: order.id });
  const wallet = await dataSource
    .getRepository(WalletEntity)
    .findOneByOrFail({ tenantId: TENANT_ID, userId: USER_ID });
  const product = await dataSource.getRepository(ProductEntity).findOneByOrFail({ id: PRODUCT_ID });
  const member = await dataSource
    .getRepository(MemberProfileEntity)
    .findOneByOrFail({ tenantId: TENANT_ID, userId: USER_ID });
  const transactions = await dataSource.getRepository(WalletTransactionEntity).find();

  assert.equal(savedOrder.status, OrderStatus.Refunded);
  assert.equal(savedOrder.memberSpendRecorded, false);
  assert.equal(savedRefund.status, OrderRefundStatus.Succeeded);
  assert.equal(wallet.balanceFen, 600);
  assert.equal(product.sold, 3);
  assert.equal(member.spendFen, 0);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0]?.type, WalletTxnType.OrderRefund);
  assert.equal(transactions[0]?.direction, FundDirection.In);
  assert.equal(transactions[0]?.amountFen, 500);
  assert.equal(transactions[0]?.bizOrderId, order.id);
});

test('双审核仅首个请求取得渠道发起权', async () => {
  const order = await seedScenario(OrderStatus.PendingService, OrderPaymentMethod.Alipay);
  const requested = await refunds.request({
    tenantId: TENANT_ID,
    orderId: order.id,
    userId: USER_ID,
    refundNo: 'REFUND-APPROVE-E2E',
    reason: '无法继续服务',
  });
  assert.equal(requested.outcome, 'created');

  const results = await Promise.all([
    refunds.begin({
      tenantId: TENANT_ID,
      orderId: order.id,
      reviewerId: 'reviewer-a',
      channelRefundNo: 'CHANNEL-DOUBLE-A',
    }),
    refunds.begin({
      tenantId: TENANT_ID,
      orderId: order.id,
      reviewerId: 'reviewer-b',
      channelRefundNo: 'CHANNEL-DOUBLE-B',
    }),
  ]);

  assert.deepEqual(results.map((result) => result.outcome).sort(), [
    'already_processing',
    'started',
  ]);
});

test('渠道失败重试递增尝试并保留首次审核审计', async () => {
  const order = await seedScenario(OrderStatus.PendingService, OrderPaymentMethod.Alipay);
  const requested = await refunds.request({
    tenantId: TENANT_ID,
    orderId: order.id,
    userId: USER_ID,
    refundNo: 'REFUND-RETRY-E2E',
    reason: '无法继续服务',
  });
  assert.equal(requested.outcome, 'created');

  const first = await refunds.begin({
    tenantId: TENANT_ID,
    orderId: order.id,
    reviewerId: 'reviewer-original',
    channelRefundNo: 'CHANNEL-REFUND-RETRY-1',
  });
  assert.equal(first.outcome, 'started');
  if (first.outcome !== 'started') {
    return;
  }
  const firstReviewedAt = first.refund.reviewedAt?.toISOString();
  const recorded = await refunds.recordChannelResult({
    tenantId: TENANT_ID,
    refundId: first.refund.id,
    channelRefundNo: first.refund.channelRefundNo,
    providerRefundNo: 'PROVIDER-REFUND-1',
  });
  assert.equal(recorded.outcome, 'recorded');
  if (recorded.outcome !== 'recorded') {
    return;
  }
  assert.equal(recorded.refund.providerRefundNo, 'PROVIDER-REFUND-1');
  const processingAttempt = await dataSource
    .getRepository(OrderRefundAttemptEntity)
    .findOneByOrFail({ refundId: first.refund.id, attempt: 1 });
  assert.equal(processingAttempt.providerRefundNo, 'PROVIDER-REFUND-1');
  assert.equal(processingAttempt.status, OrderRefundStatus.Processing);
  await refunds.fail({
    tenantId: TENANT_ID,
    refundId: first.refund.id,
    channelRefundNo: first.refund.channelRefundNo,
    providerRefundNo: 'PROVIDER-REFUND-1',
    reason: '渠道明确失败',
  });

  const retried = await refunds.begin({
    tenantId: TENANT_ID,
    orderId: order.id,
    reviewerId: 'reviewer-retry',
    channelRefundNo: 'CHANNEL-REFUND-RETRY-2',
  });
  assert.equal(retried.outcome, 'retry_started');
  if (retried.outcome !== 'retry_started') {
    return;
  }
  assert.equal(retried.refund.attempt, 2);
  assert.equal(retried.refund.channelRefundNo, 'CHANNEL-REFUND-RETRY-2');
  assert.equal(retried.refund.providerRefundNo, '');
  assert.equal(retried.refund.reviewerId, 'reviewer-original');
  assert.equal(retried.refund.reviewedAt?.toISOString(), firstReviewedAt);
  const stale = await refunds.recordChannelResult({
    tenantId: TENANT_ID,
    refundId: retried.refund.id,
    channelRefundNo: 'CHANNEL-REFUND-RETRY-1',
    providerRefundNo: 'STALE-PROVIDER-ID',
  });
  assert.equal(stale.outcome, 'invalid_status');
  const attempts = await dataSource.getRepository(OrderRefundAttemptEntity).find({
    where: { refundId: retried.refund.id },
    order: { attempt: 'ASC' },
  });
  assert.deepEqual(
    attempts.map((attempt) => ({
      attempt: attempt.attempt,
      channelRefundNo: attempt.channelRefundNo,
      reviewerId: attempt.reviewerId,
      providerRefundNo: attempt.providerRefundNo,
      status: attempt.status,
      failReason: attempt.failReason,
      finished: attempt.finishedAt !== null,
    })),
    [
      {
        attempt: 1,
        channelRefundNo: 'CHANNEL-REFUND-RETRY-1',
        reviewerId: 'reviewer-original',
        providerRefundNo: 'PROVIDER-REFUND-1',
        status: OrderRefundStatus.Failed,
        failReason: '渠道明确失败',
        finished: true,
      },
      {
        attempt: 2,
        channelRefundNo: 'CHANNEL-REFUND-RETRY-2',
        reviewerId: 'reviewer-retry',
        providerRefundNo: '',
        status: OrderRefundStatus.Processing,
        failReason: '',
        finished: false,
      },
    ],
  );
});

test('退款申请与接单竞争时至多一方推进，订单不会同时退款审核和服务中', async () => {
  const order = await seedScenario(OrderStatus.Dispatching, OrderPaymentMethod.Wechat);
  const [requestResult, servingResult] = await Promise.all([
    refunds.request({
      tenantId: TENANT_ID,
      orderId: order.id,
      userId: USER_ID,
      refundNo: 'REFUND-ACCEPT-RACE-E2E',
      reason: '无法继续服务',
    }),
    orders.claimForServing({
      orderId: order.id,
      tenantId: TENANT_ID,
      allowedStatuses: [OrderStatus.Dispatching],
      expectedRequestedBoosterId: '',
      boosterId: 'booster-e2e',
      boosterName: '并发打手',
      acceptedAt: new Date(),
    }),
  ]);
  const saved = await dataSource.getRepository(OrderEntity).findOneByOrFail({ id: order.id });
  const refundCount = await dataSource
    .getRepository(OrderRefundEntity)
    .countBy({ orderId: order.id });

  assert.notEqual(requestResult.outcome === 'created' && servingResult !== null, true);
  if (saved.status === OrderStatus.RefundReviewing) {
    assert.equal(refundCount, 1);
    assert.equal(saved.boosterId, '');
  } else {
    assert.equal(saved.status, OrderStatus.Serving);
    assert.equal(refundCount, 0);
    assert.equal(saved.boosterId, 'booster-e2e');
  }
});

test('退款申请与下发大厅竞争不会被旧订单整行保存覆盖', async () => {
  const order = await seedScenario(OrderStatus.PendingService, OrderPaymentMethod.Balance);
  await Promise.all([
    refunds.request({
      tenantId: TENANT_ID,
      orderId: order.id,
      userId: USER_ID,
      refundNo: 'REFUND-DISPATCH-RACE-E2E',
      reason: '无法继续服务',
    }),
    orders.claimForDispatch({
      orderId: order.id,
      tenantId: TENANT_ID,
      dispatchedAt: new Date(),
    }),
  ]);

  const saved = await dataSource.getRepository(OrderEntity).findOneByOrFail({ id: order.id });
  assert.equal(saved.status, OrderStatus.RefundReviewing);
  assert.equal(await dataSource.getRepository(OrderRefundEntity).countBy({ orderId: order.id }), 1);
});

test('驳回仅恢复申请前状态，不改动余额、销量和会员累计', async () => {
  const order = await seedScenario(OrderStatus.Dispatching, OrderPaymentMethod.Balance);
  const requested = await refunds.request({
    tenantId: TENANT_ID,
    orderId: order.id,
    userId: USER_ID,
    refundNo: 'REFUND-REJECT-E2E',
    reason: '无法继续服务',
  });
  assert.equal(requested.outcome, 'created');
  const rejected = await refunds.reject({
    tenantId: TENANT_ID,
    orderId: order.id,
    reviewerId: 'reviewer-e2e',
    reason: '已协商继续履约',
  });
  assert.equal(rejected.outcome, 'rejected');

  const savedOrder = await dataSource.getRepository(OrderEntity).findOneByOrFail({ id: order.id });
  const savedRefund = await dataSource
    .getRepository(OrderRefundEntity)
    .findOneByOrFail({ orderId: order.id });
  const wallet = await dataSource
    .getRepository(WalletEntity)
    .findOneByOrFail({ tenantId: TENANT_ID, userId: USER_ID });
  const product = await dataSource.getRepository(ProductEntity).findOneByOrFail({ id: PRODUCT_ID });
  const member = await dataSource
    .getRepository(MemberProfileEntity)
    .findOneByOrFail({ tenantId: TENANT_ID, userId: USER_ID });

  assert.equal(savedOrder.status, OrderStatus.Dispatching);
  assert.equal(savedRefund.status, OrderRefundStatus.Rejected);
  assert.equal(savedRefund.rejectReason, '已协商继续履约');
  assert.equal(wallet.balanceFen, 100);
  assert.equal(product.sold, 5);
  assert.equal(member.spendFen, 500);
  assert.equal(await dataSource.getRepository(WalletTransactionEntity).count(), 0);
});

test('退款订单仓储按请求租户隐藏其他租户订单', async () => {
  const foreignOrder = await dataSource.getRepository(OrderEntity).save({
    tenantId: 'tenant-refund-other',
    userId: 'user-refund-other',
    orderNo: `ORDER-${randomUUID()}`,
    productId: PRODUCT_ID,
    productTitle: '其他租户退款订单',
    quantity: 1,
    amountFen: 100,
    originalAmountFen: 100,
    provider: OrderPaymentMethod.Balance,
    status: OrderStatus.PendingService,
    paidAt: new Date(),
  });

  const hidden = await tenant.run({ tenantId: TENANT_ID, isSuper: false }, () =>
    orders.findById(foreignOrder.id),
  );
  const visible = await tenant.run({ tenantId: foreignOrder.tenantId, isSuper: false }, () =>
    orders.findById(foreignOrder.id),
  );

  assert.equal(hidden, null);
  assert.equal(visible?.id, foreignOrder.id);
});

async function seedScenario(
  status: OrderStatus.PendingService | OrderStatus.Dispatching,
  paymentMethod: OrderPaymentMethod,
): Promise<OrderEntity> {
  await dataSource.getRepository(ProductEntity).save({
    id: PRODUCT_ID,
    tenantId: TENANT_ID,
    categoryId: 'category-e2e',
    title: '退款事务商品',
    priceFen: 250,
    sold: 5,
    status: ProductStatus.OnShelf,
  });
  await dataSource.getRepository(MemberProfileEntity).save({
    tenantId: TENANT_ID,
    userId: USER_ID,
    spendFen: 500,
  });
  await dataSource.getRepository(WalletEntity).save({
    tenantId: TENANT_ID,
    userId: USER_ID,
    balanceFen: 100,
    totalRechargeFen: 0,
    totalWithdrawFen: 0,
    status: WalletStatus.Active,
  });
  return dataSource.getRepository(OrderEntity).save({
    tenantId: TENANT_ID,
    userId: USER_ID,
    orderNo: `ORDER-${randomUUID()}`,
    productId: PRODUCT_ID,
    productTitle: '退款事务商品',
    quantity: 2,
    amountFen: 500,
    originalAmountFen: 500,
    provider: paymentMethod,
    providerTradeNo: `TRADE-${randomUUID()}`,
    status,
    memberSpendRecorded: true,
    paidAt: new Date(),
  });
}
