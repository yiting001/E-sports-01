import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { AddOrderRefundReview1784736000000 } from '../src/database/migrations/1784736000000-add-order-refund-review';

const schema = `order_refund_migration_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
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

test('退款 migration 可执行 up/down 且 order_id 保持 uuid 外键', async () => {
  const migration = new AddOrderRefundReview1784736000000();
  const runner = dataSource.createQueryRunner();
  const orderId = randomUUID();
  await runner.connect();
  try {
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`
      CREATE TABLE "service_order" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "status" varchar(24) NOT NULL DEFAULT 'pending_service'
      )
    `);
    await runner.startTransaction();
    try {
      await migration.up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }
    const table = await runner.getTable(`${schema}.service_order_refund`);
    assert.ok(table);
    assert.equal(table.findColumnByName('order_id')?.type, 'uuid');
    assert.equal(table.findColumnByName('amount_fen')?.type, 'bigint');
    assert.equal(
      table.uniques.some((unique) => unique.name === 'UQ_service_order_refund_order'),
      true,
    );
    assert.equal(
      table.foreignKeys.some(
        (foreignKey) =>
          foreignKey.name === 'FK_service_order_refund_order' &&
          foreignKey.referencedTableName === 'service_order',
      ),
      true,
    );

    await runner.query(
      `INSERT INTO "service_order" ("id", "status") VALUES ($1, 'pending_service')`,
      [orderId],
    );
    await runner.query(
      `INSERT INTO "service_order_refund" (
        "tenant_id", "order_id", "user_id", "refund_no", "amount_fen",
        "payment_method", "source_order_status", "reason"
      ) VALUES (
        'tenant-migration-test', $1, 'user-migration-test', $2, 100,
        'balance', 'pending_service', '退款审计记录'
      )`,
      [orderId, `RF${randomUUID().replaceAll('-', '')}`],
    );
    await runner.startTransaction();
    await assert.rejects(migration.down(runner), /service_order_refund.*financial audit records/i);
    await runner.rollbackTransaction();

    await runner.query('DELETE FROM "service_order_refund"');
    await runner.query(`UPDATE "service_order" SET "status" = 'refund_reviewing' WHERE "id" = $1`, [
      orderId,
    ]);
    await runner.startTransaction();
    await assert.rejects(migration.down(runner), /service_order.*refund_reviewing.*refunded/i);
    await runner.rollbackTransaction();

    await runner.query(`UPDATE "service_order" SET "status" = 'pending_service' WHERE "id" = $1`, [
      orderId,
    ]);
    await runner.startTransaction();
    try {
      await migration.down(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }
    assert.equal(await runner.hasTable(`${schema}.service_order_refund`), false);
  } finally {
    if (runner.isTransactionActive) {
      await runner.rollbackTransaction();
    }
    await runner.release();
  }
});
