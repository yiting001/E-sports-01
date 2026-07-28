import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { DataSource } from 'typeorm';
import { DEFAULT_TENANT_ID } from '@app/contracts';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { AddTenantConfigOverrides1784995200000 } from '../src/database/migrations/1784995200000-add-tenant-config-overrides';

const schema = `tenant_config_override_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
const tenantA = '00000000-0000-4000-8000-0000000000a1';
const tenantB = '00000000-0000-4000-8000-0000000000b1';
const tenantC = '00000000-0000-4000-8000-0000000000c1';
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

test('租户配置 migration 复制现有值、约束隔离并拒绝有损回滚', async () => {
  const migration = new AddTenantConfigOverrides1784995200000();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(`SET search_path TO "${schema}"`);
    await createLegacyTables(runner);
    await seedLegacyData(runner);

    await runner.startTransaction();
    try {
      await migration.up(runner);
      await assertMigrationLockHeldByOtherSession();
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }

    const copied = (await runner.query(`
      SELECT "tenant_id", "key", "value"
      FROM "sys_tenant_config_override"
      ORDER BY "tenant_id", "key"
    `)) as Array<{ tenant_id: string; key: string; value: string }>;
    assert.equal(copied.length, 10);
    assert.equal(
      copied.some((item) => item.tenant_id === DEFAULT_TENANT_ID),
      false,
    );
    assert.equal(
      copied.some((item) => item.key === 'sms.provider'),
      false,
    );
    assert.equal(
      copied.find((item) => item.tenant_id === tenantA && item.key === 'system.appName')?.value,
      '升级前品牌',
    );
    assert.equal(
      copied.find((item) => item.tenant_id === tenantB && item.key === 'system.appName')?.value,
      '升级前品牌',
    );
    const overrideTable = await runner.getTable(`${schema}.sys_tenant_config_override`);
    assert.equal(
      overrideTable?.foreignKeys.some(
        (foreignKey) => foreignKey.name === 'FK_sys_tenant_config_override_tenant',
      ),
      true,
    );
    assert.equal(
      overrideTable?.foreignKeys.some(
        (foreignKey) => foreignKey.name === 'FK_sys_tenant_config_override_key',
      ),
      true,
    );
    const owners: Array<{ tableowner: string }> = await runner.query(
      `SELECT tableowner
       FROM pg_tables
       WHERE schemaname = $1
         AND tablename = 'sys_tenant_config_override'`,
      [schema],
    );
    assert.equal(owners[0]?.tableowner, 'pg_database_owner');
    await assertPublicCrudPrivileges(runner);

    await assert.rejects(
      runner.query(
        `INSERT INTO "sys_tenant_config_override" ("tenant_id", "key", "value")
         VALUES ($1, 'system.appName', '重复值')`,
        [tenantA],
      ),
      /duplicate key/i,
    );

    await runner.query(`INSERT INTO "sys_tenant" ("id", "code") VALUES ($1, 'tenant-c')`, [
      tenantC,
    ]);
    await runner.query(
      `INSERT INTO "sys_tenant_config_override" ("tenant_id", "key", "value")
       VALUES ($1, 'system.appName', '临时租户')`,
      [tenantC],
    );
    await runner.query(`DELETE FROM "sys_tenant" WHERE "id" = $1`, [tenantC]);
    assert.equal(
      Number(
        (
          (await runner.query(
            `SELECT COUNT(*) AS count FROM "sys_tenant_config_override" WHERE "tenant_id" = $1`,
            [tenantC],
          )) as Array<{ count: string }>
        )[0]?.count ?? '0',
      ),
      0,
    );

    await runner.query(
      `UPDATE "sys_tenant_config_override"
       SET "value" = '租户 A 品牌'
       WHERE "tenant_id" = $1 AND "key" = 'system.appName'`,
      [tenantA],
    );
    await runner.startTransaction();
    await assert.rejects(migration.down(runner), /values have diverged/i);
    await runner.rollbackTransaction();

    const tableAfterRejectedDown = await runner.getTable(`${schema}.sys_tenant_config_override`);
    assert.ok(tableAfterRejectedDown);

    await runner.query(
      `UPDATE "sys_tenant_config_override"
       SET "value" = '租户 B 品牌'
       WHERE "tenant_id" = $1 AND "key" = 'system.appName'`,
      [tenantB],
    );
    await runner.query(
      `DELETE FROM "sys_tenant_config_override"
       WHERE "tenant_id" = $1 AND "key" = 'system.appName'`,
      [tenantA],
    );
    await runner.startTransaction();
    await assert.rejects(migration.down(runner), /values have diverged/i);
    await runner.rollbackTransaction();

    await runner.query(
      `UPDATE "sys_tenant_config_override"
       SET "value" = '升级前品牌'
       WHERE "key" = 'system.appName'`,
    );
    await runner.startTransaction();
    try {
      await migration.down(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }
    assert.equal(await runner.getTable(`${schema}.sys_tenant_config_override`), undefined);
  } finally {
    await runner.release();
  }
});

async function assertMigrationLockHeldByOtherSession(): Promise<void> {
  const competingRunner = dataSource.createQueryRunner();
  await competingRunner.connect();
  try {
    const rows = (await competingRunner.query(`
      SELECT pg_try_advisory_xact_lock(
        hashtext('1784995200000-add-tenant-config-overrides')
      ) AS "acquired"
    `)) as Array<{ acquired: boolean }>;
    assert.equal(rows[0]?.acquired, false);
  } finally {
    await competingRunner.release();
  }
}

async function createLegacyTables(
  runner: ReturnType<DataSource['createQueryRunner']>,
): Promise<void> {
  await runner.query(`
    CREATE TABLE "sys_tenant" (
      "id" uuid NOT NULL,
      "code" varchar(64) NOT NULL,
      CONSTRAINT "PK_sys_tenant" PRIMARY KEY ("id")
    )
  `);
  await runner.query(`
    CREATE TABLE "sys_config" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "version" integer NOT NULL DEFAULT 1,
      "key" varchar(128) NOT NULL,
      "value" text NOT NULL,
      CONSTRAINT "PK_sys_config" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_sys_config_key" UNIQUE ("key")
    )
  `);
  await runner.query(`GRANT USAGE, CREATE ON SCHEMA "${schema}" TO pg_database_owner`);
  await runner.query('ALTER TABLE "sys_config" OWNER TO pg_database_owner');
  await runner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "sys_config" TO PUBLIC`);
}

async function assertPublicCrudPrivileges(
  runner: ReturnType<DataSource['createQueryRunner']>,
): Promise<void> {
  const rows = (await runner.query(
    `SELECT "privilege_type"
     FROM information_schema.table_privileges
     WHERE "table_schema" = $1
       AND "table_name" = 'sys_tenant_config_override'
       AND "grantee" = 'PUBLIC'`,
    [schema],
  )) as Array<{ privilege_type: string }>;
  assert.deepEqual(
    new Set(rows.map(({ privilege_type }) => privilege_type)),
    new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
  );
}

async function seedLegacyData(runner: ReturnType<DataSource['createQueryRunner']>): Promise<void> {
  await runner.query(
    `INSERT INTO "sys_tenant" ("id", "code")
     VALUES ($1, 'default'), ($2, 'tenant-a'), ($3, 'tenant-b')`,
    [DEFAULT_TENANT_ID, tenantA, tenantB],
  );
  await runner.query(`
    INSERT INTO "sys_config" ("key", "value")
    VALUES
      ('system.appName', '升级前品牌'),
      ('system.appLogo', '/logo.png'),
      ('portal.homeBanner', '{"items":[]}'),
      ('portal.showRank', 'true'),
      ('auth.userAgreement', '<p>协议</p>'),
      ('sms.provider', 'log')
  `);
}
