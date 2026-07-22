import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';
import {
  OrderPaymentMethod,
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
import {
  MemberSpendTransactionParticipant,
  TypeormMemberSpendTransactionParticipant,
} from '../src/modules/member/infrastructure/member-spend-transaction.participant';
import { OrderRefundAttemptEntity } from '../src/modules/order/domain/order-refund-attempt.entity';
import { OrderRefundEntity } from '../src/modules/order/domain/order-refund.entity';
import { OrderEntity } from '../src/modules/order/domain/order.entity';
import { TypeormOrderPaymentSettlement } from '../src/modules/order/infrastructure/order-payment.settlement';
import { TypeormOrderRefundTransaction } from '../src/modules/order/infrastructure/order-refund.transaction';
import { TypeormOrderRepository } from '../src/modules/order/infrastructure/order.repository';
import { WalletEntity } from '../src/modules/wallet/domain/wallet.entity';
import { WalletTransactionEntity } from '../src/modules/wallet/domain/wallet-transaction.entity';
import { TypeormWalletTransactionParticipant } from '../src/modules/wallet/infrastructure/wallet-transaction.participant';
import { TenantContextService } from '../src/shared/tenant/tenant-context.service';

const TENANT_ID = 'tenant-payment-member-e2e';
const USER_ID = 'user-payment-member-e2e';
const PRODUCT_A_ID = '00000000-0000-4000-8000-000000000301';
const PRODUCT_B_ID = '00000000-0000-4000-8000-000000000302';
const schema = `order_payment_member_e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`;

let adminDataSource: DataSource;
let dataSource: DataSource;
let memberSpend: TypeormMemberSpendTransactionParticipant;
let payments: TypeormOrderPaymentSettlement;
let refunds: TypeormOrderRefundTransaction;
let orders: TypeormOrderRepository;

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
  memberSpend = new TypeormMemberSpendTransactionParticipant();
  payments = new TypeormOrderPaymentSettlement(dataSource, memberSpend);
  refunds = new TypeormOrderRefundTransaction(
    dataSource,
    new TypeormWalletTransactionParticipant(),
    new TypeormProductSalesTransactionParticipant(),
    memberSpend,
  );
  orders = new TypeormOrderRepository(
    dataSource.getRepository(OrderEntity),
    new TenantContextService(),
  );
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

test('同一新用户的不同渠道订单并发支付只建一份会员档案并完整累计', async () => {
  await seedProduct(PRODUCT_A_ID);
  await seedProduct(PRODUCT_B_ID);
  const first = await seedOrder(PRODUCT_A_ID, 300, 2, OrderPaymentMethod.Alipay);
  const second = await seedOrder(PRODUCT_B_ID, 400, 1, OrderPaymentMethod.Wechat);

  const results = await Promise.all([
    payments.settle({
      orderNo: first.orderNo,
      method: first.provider,
      providerTradeNo: `TRADE-${first.id}`,
      paidAmountFen: first.amountFen,
    }),
    payments.settle({
      orderNo: second.orderNo,
      method: second.provider,
      providerTradeNo: `TRADE-${second.id}`,
      paidAmountFen: second.amountFen,
    }),
  ]);

  assert.equal(results.filter(Boolean).length, 2);
  const profiles = await dataSource
    .getRepository(MemberProfileEntity)
    .findBy({ tenantId: TENANT_ID, userId: USER_ID });
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0]?.spendFen, 700);
  assert.equal((await getOrder(first.id)).memberSpendRecorded, true);
  assert.equal((await getOrder(second.id)).memberSpendRecorded, true);
});

test('真实支付后退款只冲正目标订单，重复支付与重复完成不会重复记账', async () => {
  await seedProduct(PRODUCT_A_ID);
  await seedWallet(2_000);
  const first = await seedOrder(PRODUCT_A_ID, 500, 2, OrderPaymentMethod.Balance);
  const second = await seedOrder(PRODUCT_A_ID, 300, 1, OrderPaymentMethod.Balance);

  const paymentResults = await Promise.all([
    payments.settleBalance({ orderId: first.id, userId: USER_ID, paidAmountFen: 500 }),
    payments.settleBalance({ orderId: first.id, userId: USER_ID, paidAmountFen: 500 }),
    payments.settleBalance({ orderId: second.id, userId: USER_ID, paidAmountFen: 300 }),
  ]);
  assert.equal(paymentResults.filter(Boolean).length, 2);
  assert.equal((await getMember()).spendFen, 800);

  const requested = await refunds.request({
    tenantId: TENANT_ID,
    orderId: first.id,
    userId: USER_ID,
    refundNo: `R${randomUUID().replaceAll('-', '')}`,
    reason: '无法继续服务',
  });
  assert.equal(requested.outcome, 'created');
  const begun = await refunds.begin({
    tenantId: TENANT_ID,
    orderId: first.id,
    reviewerId: 'reviewer-payment-member-e2e',
    channelRefundNo: '',
  });
  assert.equal(begun.outcome, 'started');
  if (begun.outcome !== 'started') {
    return;
  }
  const completeInput = {
    tenantId: TENANT_ID,
    refundId: begun.refund.id,
    channelRefundNo: '',
    providerRefundNo: `BALANCE-${begun.refund.refundNo}`,
  };
  const completed = await Promise.all([
    refunds.complete(completeInput),
    refunds.complete(completeInput),
  ]);
  assert.deepEqual(completed.map((result) => result.outcome).sort(), [
    'already_completed',
    'completed',
  ]);

  const savedFirst = await getOrder(first.id);
  const savedSecond = await getOrder(second.id);
  const wallet = await dataSource
    .getRepository(WalletEntity)
    .findOneByOrFail({ tenantId: TENANT_ID, userId: USER_ID });
  const product = await dataSource
    .getRepository(ProductEntity)
    .findOneByOrFail({ id: PRODUCT_A_ID });
  const transactions = await dataSource.getRepository(WalletTransactionEntity).find();
  assert.equal(savedFirst.status, OrderStatus.Refunded);
  assert.equal(savedFirst.memberSpendRecorded, false);
  assert.equal(savedSecond.status, OrderStatus.PendingService);
  assert.equal(savedSecond.memberSpendRecorded, true);
  assert.equal((await getMember()).spendFen, 300);
  assert.equal(wallet.balanceFen, 1_700);
  assert.equal(product.sold, 1);
  assert.equal(
    transactions.filter((transaction) => transaction.type === WalletTxnType.OrderRefund).length,
    1,
  );
});

test('会员累计写入后发生故障会回滚订单、销量和会员档案', async () => {
  await seedProduct(PRODUCT_A_ID);
  const order = await seedOrder(PRODUCT_A_ID, 400, 1, OrderPaymentMethod.Alipay);
  const failingMemberSpend: MemberSpendTransactionParticipant = {
    record: async (manager, input) => {
      await memberSpend.record(manager, input);
      throw new Error('模拟会员累计后的事务故障');
    },
    rollback: (manager, input) => memberSpend.rollback(manager, input),
  };
  const failingPayments = new TypeormOrderPaymentSettlement(dataSource, failingMemberSpend);

  await assert.rejects(
    failingPayments.settle({
      orderNo: order.orderNo,
      method: order.provider,
      providerTradeNo: `TRADE-${order.id}`,
      paidAmountFen: order.amountFen,
    }),
    /模拟会员累计后的事务故障/,
  );

  assert.equal((await getOrder(order.id)).status, OrderStatus.PendingPayment);
  assert.equal(await dataSource.getRepository(MemberProfileEntity).count(), 0);
  assert.equal(
    (await dataSource.getRepository(ProductEntity).findOneByOrFail({ id: PRODUCT_A_ID })).sold,
    0,
  );
});

test('取消与余额支付竞争时只允许一个状态推进且资金账本保持一致', async () => {
  await seedProduct(PRODUCT_A_ID);
  await seedWallet(1_000);
  const order = await seedOrder(PRODUCT_A_ID, 500, 1, OrderPaymentMethod.Balance);

  await Promise.allSettled([
    payments.settleBalance({ orderId: order.id, userId: USER_ID, paidAmountFen: 500 }),
    orders.claimForCancellation({
      orderId: order.id,
      tenantId: TENANT_ID,
      userId: USER_ID,
      cancelledAt: new Date(),
    }),
  ]);

  const saved = await getOrder(order.id);
  const wallet = await dataSource
    .getRepository(WalletEntity)
    .findOneByOrFail({ tenantId: TENANT_ID, userId: USER_ID });
  const product = await dataSource
    .getRepository(ProductEntity)
    .findOneByOrFail({ id: PRODUCT_A_ID });
  if (saved.status === OrderStatus.Cancelled) {
    assert.equal(wallet.balanceFen, 1_000);
    assert.equal(product.sold, 0);
    assert.equal(await dataSource.getRepository(MemberProfileEntity).count(), 0);
    assert.equal(saved.memberSpendRecorded, false);
    return;
  }
  assert.equal(saved.status, OrderStatus.PendingService);
  assert.equal(wallet.balanceFen, 500);
  assert.equal(product.sold, 1);
  assert.equal((await getMember()).spendFen, 500);
  assert.equal(saved.memberSpendRecorded, true);
});

async function seedProduct(id: string): Promise<void> {
  await dataSource.getRepository(ProductEntity).save({
    id,
    tenantId: TENANT_ID,
    categoryId: 'category-payment-member-e2e',
    title: `事务商品-${id.slice(-3)}`,
    priceFen: 500,
    sold: 0,
    status: ProductStatus.OnShelf,
  });
}

async function seedWallet(balanceFen: number): Promise<void> {
  await dataSource.getRepository(WalletEntity).save({
    tenantId: TENANT_ID,
    userId: USER_ID,
    balanceFen,
    totalRechargeFen: 0,
    totalWithdrawFen: 0,
    status: WalletStatus.Active,
  });
}

function seedOrder(
  productId: string,
  amountFen: number,
  quantity: number,
  provider: OrderPaymentMethod,
): Promise<OrderEntity> {
  return dataSource.getRepository(OrderEntity).save({
    tenantId: TENANT_ID,
    userId: USER_ID,
    orderNo: `ORDER-${randomUUID()}`,
    productId,
    productTitle: '支付退款事务商品',
    quantity,
    amountFen,
    originalAmountFen: amountFen,
    provider,
    status: OrderStatus.PendingPayment,
  });
}

function getOrder(id: string): Promise<OrderEntity> {
  return dataSource.getRepository(OrderEntity).findOneByOrFail({ id });
}

function getMember(): Promise<MemberProfileEntity> {
  return dataSource
    .getRepository(MemberProfileEntity)
    .findOneByOrFail({ tenantId: TENANT_ID, userId: USER_ID });
}
