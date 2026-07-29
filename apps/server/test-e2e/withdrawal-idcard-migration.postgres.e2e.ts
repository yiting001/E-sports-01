import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { AddWithdrawalIdCard1785700000000 } from '../src/database/migrations/1785700000000-add-withdrawal-idcard';

const schema = `withdrawal_idcard_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
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

test('提现身份证字段 migration 保留历史空值并支持完整回滚', async () => {
  const migration = new AddWithdrawalIdCard1785700000000();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`
      CREATE TABLE "wallet_withdrawal_order" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "out_biz_no" varchar(64) NOT NULL,
        CONSTRAINT "PK_withdrawal_order" PRIMARY KEY ("id")
      )
    `);
    await runner.query(
      `INSERT INTO "wallet_withdrawal_order" ("out_biz_no") VALUES ('historical-order')`,
    );

    await runner.startTransaction();
    try {
      await migration.up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }

    const tableAfterUp = await runner.getTable(`${schema}.wallet_withdrawal_order`);
    const idCardColumn = tableAfterUp?.findColumnByName('idCardNo');
    assert.equal(idCardColumn?.type, 'character varying');
    assert.equal(idCardColumn?.length, '18');
    assert.equal(idCardColumn?.isNullable, true);

    const historicalRows = (await runner.query(
      `SELECT "out_biz_no" AS "outBizNo", "idCardNo" FROM "wallet_withdrawal_order"`,
    )) as Array<{ outBizNo: string; idCardNo: string | null }>;
    assert.deepEqual(historicalRows, [{ outBizNo: 'historical-order', idCardNo: null }]);

    const idCardNo = '110101199001011234';
    await runner.query(
      `UPDATE "wallet_withdrawal_order" SET "idCardNo" = $1 WHERE "out_biz_no" = $2`,
      [idCardNo, 'historical-order'],
    );
    const updatedRows = (await runner.query(
      `SELECT "idCardNo" FROM "wallet_withdrawal_order" WHERE "out_biz_no" = $1`,
      ['historical-order'],
    )) as Array<{ idCardNo: string }>;
    assert.deepEqual(updatedRows, [{ idCardNo }]);

    await runner.startTransaction();
    try {
      await migration.down(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }

    const tableAfterDown = await runner.getTable(`${schema}.wallet_withdrawal_order`);
    assert.equal(tableAfterDown?.findColumnByName('idCardNo'), undefined);
  } finally {
    await runner.release();
  }
});
