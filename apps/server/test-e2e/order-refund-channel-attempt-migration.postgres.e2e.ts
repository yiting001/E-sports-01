import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { DataSource, type QueryRunner } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { AddOrderRefundReview1784736000000 } from '../src/database/migrations/1784736000000-add-order-refund-review';
import { AddOrderRefundChannelAttempt1784736100000 } from '../src/database/migrations/1784736100000-add-order-refund-channel-attempt';

const schema = `order_refund_attempt_migration_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
let adminDataSource: DataSource;
let dataSource: DataSource;

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
  dataSource = await new DataSource(connection).initialize();
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

test('渠道尝试 migration 可回填现有执行单并独立回滚', async () => {
  const base = new AddOrderRefundReview1784736000000();
  const migration = new AddOrderRefundChannelAttempt1784736100000();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query('CREATE TABLE "service_order" ("id" uuid PRIMARY KEY)');
    await base.up(runner);
    await seedRefund(
      runner,
      '00000000-0000-4000-8000-000000000301',
      'REFUND-PENDING',
      'pending_review',
    );
    await seedRefund(
      runner,
      '00000000-0000-4000-8000-000000000302',
      'REFUND-PROCESSING',
      'processing',
    );
    await seedRefund(
      runner,
      '00000000-0000-4000-8000-000000000303',
      'REFUND-BALANCE',
      'succeeded',
      'balance',
    );

    await runner.startTransaction();
    try {
      await migration.up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }

    const rows = (await runner.query(
      'SELECT "refund_no", "channel_refund_no", "attempt" FROM "service_order_refund" ORDER BY "refund_no"',
    )) as Array<{ refund_no: string; channel_refund_no: string; attempt: number }>;
    assert.deepEqual(rows, [
      { refund_no: 'REFUND-BALANCE', channel_refund_no: '', attempt: 0 },
      { refund_no: 'REFUND-PENDING', channel_refund_no: '', attempt: 0 },
      {
        refund_no: 'REFUND-PROCESSING',
        channel_refund_no: 'REFUND-PROCESSING',
        attempt: 1,
      },
    ]);
    const attempts = (await runner.query(
      `SELECT "attempt", "channel_refund_no", "status"
       FROM "service_order_refund_attempt" ORDER BY "attempt"`,
    )) as Array<{ attempt: number; channel_refund_no: string; status: string }>;
    assert.deepEqual(attempts, [
      { attempt: 1, channel_refund_no: 'REFUND-PROCESSING', status: 'processing' },
    ]);
    const table = await runner.getTable(`${schema}.service_order_refund`);
    assert.ok(table?.findColumnByName('channel_refund_no'));
    assert.equal(table?.findColumnByName('attempt')?.type, 'integer');
    const channelIndex = table?.indices.find(
      (index) => index.name === 'UQ_service_order_refund_channel_no',
    );
    assert.equal(channelIndex?.isUnique, true);
    assert.match(channelIndex?.where ?? '', /channel_refund_no.*<>/);

    await runner.startTransaction();
    await assert.rejects(migration.down(runner), /渠道尝试审计非空，拒绝回滚/);
    await runner.rollbackTransaction();
    await runner.query('DELETE FROM "service_order_refund_attempt"');
    await runner.query(`UPDATE "service_order_refund" SET "channel_refund_no" = '', "attempt" = 0`);
    await runner.startTransaction();
    try {
      await migration.down(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }
    const reverted = await runner.getTable(`${schema}.service_order_refund`);
    assert.equal(reverted?.findColumnByName('channel_refund_no'), undefined);
    assert.equal(reverted?.findColumnByName('attempt'), undefined);
  } finally {
    if (runner.isTransactionActive) {
      await runner.rollbackTransaction();
    }
    await runner.release();
  }
});

async function seedRefund(
  runner: QueryRunner,
  orderId: string,
  refundNo: string,
  status: string,
  paymentMethod = 'alipay',
): Promise<void> {
  await runner.query('INSERT INTO "service_order" ("id") VALUES ($1)', [orderId]);
  await runner.query(
    `INSERT INTO "service_order_refund" (
      "tenant_id", "order_id", "user_id", "refund_no", "amount_fen", "payment_method",
      "source_order_status", "reason", "status"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      'tenant-migration',
      orderId,
      'user-migration',
      refundNo,
      100,
      paymentMethod,
      'pending_service',
      '退款原因',
      status,
    ],
  );
}
