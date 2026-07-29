import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { AddConversationMemberTag1785600000000 } from '../src/database/migrations/1785600000000-add-conversation-member-tag';

const schema = `conversation_member_tag_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
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

test('会话成员标签 migration 回填空标签并支持完整回滚', async () => {
  const migration = new AddConversationMemberTag1785600000000();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`
      CREATE TABLE "sys_conversation_member" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" varchar(36) NOT NULL,
        CONSTRAINT "PK_conversation_member" PRIMARY KEY ("id")
      )
    `);
    await runner.query(
      `INSERT INTO "sys_conversation_member" ("user_id") VALUES ('historical-user')`,
    );

    await runner.startTransaction();
    try {
      await migration.up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }

    const tableAfterUp = await runner.getTable(`${schema}.sys_conversation_member`);
    const tagColumn = tableAfterUp?.findColumnByName('tag');
    assert.equal(tagColumn?.type, 'character varying');
    assert.equal(tagColumn?.length, '16');
    assert.equal(tagColumn?.isNullable, false);
    assert.match(tagColumn?.default ?? '', /''/);

    await runner.query(`INSERT INTO "sys_conversation_member" ("user_id") VALUES ('new-user')`);
    const rows = (await runner.query(
      `SELECT "user_id" AS "userId", "tag" FROM "sys_conversation_member" ORDER BY "user_id"`,
    )) as Array<{ userId: string; tag: string }>;
    assert.deepEqual(rows, [
      { userId: 'historical-user', tag: '' },
      { userId: 'new-user', tag: '' },
    ]);

    await runner.startTransaction();
    try {
      await migration.down(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }

    const tableAfterDown = await runner.getTable(`${schema}.sys_conversation_member`);
    assert.equal(tableAfterDown?.findColumnByName('tag'), undefined);
  } finally {
    await runner.release();
  }
});
