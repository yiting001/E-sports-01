import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import {
  OrderPaymentMethod,
  OrderRefundStatus,
  OrderStatus,
  ProductStatus,
  WalletStatus,
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
import { WalletEntity } from '../src/modules/wallet/domain/wallet.entity';
import { WalletTransactionEntity } from '../src/modules/wallet/domain/wallet-transaction.entity';
import { TypeormWalletTransactionParticipant } from '../src/modules/wallet/infrastructure/wallet-transaction.participant';

const TENANT_ID = 'tenant-refund-isolation-e2e';
const WRONG_TENANT_ID = 'tenant-refund-isolation-other';
const USER_ID = 'user-refund-isolation-e2e';
const PRODUCT_ID = '00000000-0000-4000-8000-000000000701';
const schema = `order_refund_tenant_e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`;

let adminDataSource: DataSource;
let dataSource: DataSource;
let refunds: TypeormOrderRefundTransaction;

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

test('错误租户不能推进退款或改动资金、销量和会员累计', async () => {
  await seedScenario();
  const order = await dataSource.getRepository(OrderEntity).findOneByOrFail({ tenantId: TENANT_ID });

  const wrongRequest = await refunds.request({
    tenantId: WRONG_TENANT_ID,
    orderId: order.id,
    userId: USER_ID,
    refundNo: 'REFUND-WRONG-TENANT',
    reason: '跨租户申请',
  });
  assert.equal(wrongRequest.outcome, 'not_found');

  const requested = await refunds.request({
    tenantId: TENANT_ID,
    orderId: order.id,
    userId: USER_ID,
    refundNo: 'REFUND-TENANT-E2E',
    reason: '无法继续服务',
  });
  assert.equal(requested.outcome, 'created');
  const begun = await refunds.begin({
    tenantId: TENANT_ID,
    orderId: order.id,
    reviewerId: 'reviewer-tenant-e2e',
    channelRefundNo: 'CHANNEL-TENANT-E2E',
  });
  assert.equal(begun.outcome, 'started');
  if (begun.outcome !== 'started') {
    return;
  }

  const recorded = await refunds.recordChannelResult({
    tenantId: WRONG_TENANT_ID,
    refundId: begun.refund.id,
    channelRefundNo: begun.refund.channelRefundNo,
    providerRefundNo: 'PROVIDER-WRONG-TENANT',
  });
  const completed = await refunds.complete({
    tenantId: WRONG_TENANT_ID,
    refundId: begun.refund.id,
    channelRefundNo: begun.refund.channelRefundNo,
    providerRefundNo: 'PROVIDER-WRONG-TENANT',
  });
  const failed = await refunds.fail({
    tenantId: WRONG_TENANT_ID,
    refundId: begun.refund.id,
    channelRefundNo: begun.refund.channelRefundNo,
    providerRefundNo: 'PROVIDER-WRONG-TENANT',
    reason: '错误租户失败写入',
  });
  const rejected = await refunds.reject({
    tenantId: WRONG_TENANT_ID,
    orderId: order.id,
    reviewerId: 'reviewer-wrong-tenant',
    reason: '错误租户驳回',
  });

  assert.equal(recorded.outcome, 'not_found');
  assert.equal(completed.outcome, 'not_found');
  assert.equal(failed, null);
  assert.equal(rejected.outcome, 'not_found');
  await assertScenarioUnchanged(order.id, begun.refund.id);
});

async function seedScenario(): Promise<void> {
  await dataSource.getRepository(ProductEntity).save({
    id: PRODUCT_ID,
    tenantId: TENANT_ID,
    categoryId: 'category-refund-isolation-e2e',
    title: '退款租户隔离商品',
    priceFen: 500,
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
  await dataSource.getRepository(OrderEntity).save({
    tenantId: TENANT_ID,
    userId: USER_ID,
    orderNo: `ORDER-${randomUUID()}`,
    productId: PRODUCT_ID,
    productTitle: '退款租户隔离商品',
    quantity: 1,
    amountFen: 500,
    originalAmountFen: 500,
    provider: OrderPaymentMethod.Alipay,
    providerTradeNo: `TRADE-${randomUUID()}`,
    status: OrderStatus.PendingService,
    memberSpendRecorded: true,
    paidAt: new Date(),
  });
}

async function assertScenarioUnchanged(orderId: string, refundId: string): Promise<void> {
  const order = await dataSource.getRepository(OrderEntity).findOneByOrFail({ id: orderId });
  const refund = await dataSource.getRepository(OrderRefundEntity).findOneByOrFail({ id: refundId });
  const attempt = await dataSource
    .getRepository(OrderRefundAttemptEntity)
    .findOneByOrFail({ refundId });
  const wallet = await dataSource
    .getRepository(WalletEntity)
    .findOneByOrFail({ tenantId: TENANT_ID, userId: USER_ID });
  const product = await dataSource.getRepository(ProductEntity).findOneByOrFail({ id: PRODUCT_ID });
  const member = await dataSource
    .getRepository(MemberProfileEntity)
    .findOneByOrFail({ tenantId: TENANT_ID, userId: USER_ID });

  assert.equal(order.status, OrderStatus.RefundReviewing);
  assert.equal(refund.status, OrderRefundStatus.Processing);
  assert.equal(refund.providerRefundNo, '');
  assert.equal(attempt.status, OrderRefundStatus.Processing);
  assert.equal(attempt.providerRefundNo, '');
  assert.equal(wallet.balanceFen, 100);
  assert.equal(product.sold, 5);
  assert.equal(member.spendFen, 500);
  assert.equal(await dataSource.getRepository(WalletTransactionEntity).count(), 0);
}
