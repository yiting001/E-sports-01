import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { AddProductPcPrices1784908800000 } from '../src/database/migrations/1784908800000-add-product-pc-prices';

const schema = `product_platform_prices_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
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

test('商品双端价格 migration 安全回填、校验历史数据并支持空表升级', async () => {
  const migration = new AddProductPcPrices1784908800000();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`
      CREATE TABLE "commerce_product" (
        "id" varchar(36) PRIMARY KEY,
        "status" varchar(32) NOT NULL,
        "price_fen" integer NOT NULL DEFAULT 0,
        "origin_price_fen" integer NOT NULL DEFAULT 0
      )
    `);
    await runner.query(`
      INSERT INTO "commerce_product" ("id", "status", "price_fen", "origin_price_fen")
      VALUES
        ('product-a', 'on_shelf', 1000, 1200),
        ('product-b', 'off_shelf', 1500, 1800)
    `);

    await runner.startTransaction();
    try {
      await migration.up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }

    const rows = (await runner.query(`
      SELECT "id", "price_fen", "origin_price_fen", "pc_price_fen", "pc_origin_price_fen"
      FROM "commerce_product"
      ORDER BY "id"
    `)) as Array<{
      id: string;
      price_fen: number;
      origin_price_fen: number;
      pc_price_fen: number;
      pc_origin_price_fen: number;
    }>;
    assert.deepEqual(rows, [
      {
        id: 'product-a',
        price_fen: 1_000,
        origin_price_fen: 1_200,
        pc_price_fen: 1_000,
        pc_origin_price_fen: 1_200,
      },
      {
        id: 'product-b',
        price_fen: 1_500,
        origin_price_fen: 1_800,
        pc_price_fen: 1_500,
        pc_origin_price_fen: 1_800,
      },
    ]);

    await runner.query(
      `UPDATE "commerce_product" SET "pc_price_fen" = 900 WHERE "id" = 'product-a'`,
    );
    await runner.startTransaction();
    await assert.rejects(migration.down(runner), /distinct platform pricing/i);
    await runner.rollbackTransaction();

    const tableAfterRejectedDown = await runner.getTable(`${schema}.commerce_product`);
    assert.ok(tableAfterRejectedDown?.findColumnByName('pc_price_fen'));
    assert.ok(tableAfterRejectedDown?.findColumnByName('pc_origin_price_fen'));

    await runner.query(`
      UPDATE "commerce_product"
      SET "pc_price_fen" = "price_fen", "pc_origin_price_fen" = "origin_price_fen"
    `);
    await runner.startTransaction();
    try {
      await migration.down(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }
    const tableAfterDown = await runner.getTable(`${schema}.commerce_product`);
    assert.equal(tableAfterDown?.findColumnByName('pc_price_fen'), undefined);
    assert.equal(tableAfterDown?.findColumnByName('pc_origin_price_fen'), undefined);

    await runner.query(`
      UPDATE "commerce_product"
      SET "status" = 'on_shelf', "price_fen" = 0
      WHERE "id" = 'product-a'
    `);
    await runner.startTransaction();
    await assert.rejects(migration.up(runner), /on-shelf products have non-positive mobile prices/i);
    await runner.rollbackTransaction();
    const tableAfterRejectedUp = await runner.getTable(`${schema}.commerce_product`);
    assert.equal(tableAfterRejectedUp?.findColumnByName('pc_price_fen'), undefined);
    assert.equal(tableAfterRejectedUp?.findColumnByName('pc_origin_price_fen'), undefined);

    await runner.query(`DELETE FROM "commerce_product"`);
    await runner.startTransaction();
    try {
      await migration.up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }
    const emptyTableAfterUp = await runner.getTable(`${schema}.commerce_product`);
    assert.ok(emptyTableAfterUp?.findColumnByName('pc_price_fen'));
    assert.ok(emptyTableAfterUp?.findColumnByName('pc_origin_price_fen'));

    await runner.startTransaction();
    try {
      await migration.down(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }
  } finally {
    await runner.release();
  }
});
