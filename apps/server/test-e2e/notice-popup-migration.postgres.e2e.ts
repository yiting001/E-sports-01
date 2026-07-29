import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { AddNoticePopup1785500000000 } from '../src/database/migrations/1785500000000-add-notice-popup';

const schema = `notice_popup_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
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

test('弹窗公告 migration 回填历史数据并支持完整回滚', async () => {
  const migration = new AddNoticePopup1785500000000();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`
      CREATE TABLE "notice" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        CONSTRAINT "PK_notice" PRIMARY KEY ("id")
      )
    `);
    await runner.query(`INSERT INTO "notice" ("title") VALUES ('历史公告')`);

    await runner.startTransaction();
    try {
      await migration.up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }

    const tableAfterUp = await runner.getTable(`${schema}.notice`);
    const popupColumn = tableAfterUp?.findColumnByName('popup');
    assert.equal(popupColumn?.isNullable, false);
    assert.match(popupColumn?.default ?? '', /false/i);
    assert.equal(
      tableAfterUp?.indices.some(({ name }) => name === 'IDX_notice_popup'),
      true,
    );

    const rows = (await runner.query(
      `SELECT "title", "popup" FROM "notice" ORDER BY "title"`,
    )) as Array<{ title: string; popup: boolean }>;
    assert.deepEqual(rows, [{ title: '历史公告', popup: false }]);

    await runner.query(`UPDATE "notice" SET "popup" = true WHERE "title" = '历史公告'`);
    await runner.startTransaction();
    try {
      await migration.down(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }

    const tableAfterDown = await runner.getTable(`${schema}.notice`);
    assert.equal(tableAfterDown?.findColumnByName('popup'), undefined);
    assert.equal(
      tableAfterDown?.indices.some(({ name }) => name === 'IDX_notice_popup'),
      false,
    );
  } finally {
    await runner.release();
  }
});
