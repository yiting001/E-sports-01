import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { AddOrderMemberSpendLedger1784736200000 } from '../src/database/migrations/1784736200000-add-order-member-spend-ledger';

const schema = `order_member_spend_migration_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
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

test('会员累计 migration 按已支付订单修复历史数据并建立逐单冲正标记', async () => {
  const migration = new AddOrderMemberSpendLedger1784736200000();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`
      CREATE TABLE "service_order" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" varchar(36) NOT NULL,
        "user_id" varchar(36) NOT NULL,
        "amount_fen" bigint NOT NULL,
        "status" varchar(24) NOT NULL
      )
    `);
    await runner.query(`
      CREATE TABLE "member_profile" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "tenant_id" varchar(36) NOT NULL,
        "user_id" varchar(36) NOT NULL,
        "spend_fen" bigint NOT NULL DEFAULT 0,
        UNIQUE ("tenant_id", "user_id")
      )
    `);
    await runner.query(`
      CREATE TABLE "service_order_refund" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid()
      )
    `);
    await runner.query(`
      INSERT INTO "member_profile" ("tenant_id", "user_id", "spend_fen")
      VALUES ('tenant-a', 'user-a', 999), ('tenant-a', 'user-no-orders', 50)
    `);
    await runner.query(`
      INSERT INTO "service_order" ("tenant_id", "user_id", "amount_fen", "status")
      VALUES
        ('tenant-a', 'user-a', 100, 'pending_service'),
        ('tenant-a', 'user-a', 200, 'completed'),
        ('tenant-a', 'user-a', 400, 'pending_payment'),
        ('tenant-a', 'user-b', 250, 'dispatching'),
        ('tenant-a', 'user-b', 80, 'refunded')
    `);

    await runner.startTransaction();
    try {
      await migration.up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }

    const profiles = (await runner.query(
      `SELECT "user_id", "spend_fen" FROM "member_profile" ORDER BY "user_id"`,
    )) as Array<{ user_id: string; spend_fen: string }>;
    assert.deepEqual(profiles, [
      { user_id: 'user-a', spend_fen: '300' },
      { user_id: 'user-b', spend_fen: '250' },
      { user_id: 'user-no-orders', spend_fen: '0' },
    ]);
    const recorded = (await runner.query(
      `SELECT "amount_fen", "member_spend_recorded" FROM "service_order" ORDER BY "amount_fen"`,
    )) as Array<{ amount_fen: string; member_spend_recorded: boolean }>;
    assert.deepEqual(recorded, [
      { amount_fen: '80', member_spend_recorded: false },
      { amount_fen: '100', member_spend_recorded: true },
      { amount_fen: '200', member_spend_recorded: true },
      { amount_fen: '250', member_spend_recorded: true },
      { amount_fen: '400', member_spend_recorded: false },
    ]);

    await runner.startTransaction();
    await assert.rejects(migration.down(runner), /member_spend_recorded.*refund business data/i);
    await runner.rollbackTransaction();
    await runner.query(`UPDATE "service_order" SET "status" = 'cancelled'`);
    await runner.startTransaction();
    try {
      await migration.down(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }
    const table = await runner.getTable(`${schema}.service_order`);
    assert.equal(table?.findColumnByName('member_spend_recorded'), undefined);
  } finally {
    await runner.release();
  }
});
