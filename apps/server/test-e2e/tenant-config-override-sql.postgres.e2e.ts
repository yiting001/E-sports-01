import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { DEFAULT_TENANT_ID } from '@app/contracts';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';

const schema = `tenant_config_sql_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
const missingHistorySchema = `tenant_config_no_history_${randomUUID()
  .replaceAll('-', '')
  .slice(0, 12)}`;
const incompleteHistorySchema = `tenant_config_bad_history_${randomUUID()
  .replaceAll('-', '')
  .slice(0, 12)}`;
const recordedMigrationSchema = `tenant_config_recorded_${randomUUID()
  .replaceAll('-', '')
  .slice(0, 12)}`;
const duplicateHistorySchema = `tenant_config_duplicate_${randomUUID()
  .replaceAll('-', '')
  .slice(0, 12)}`;
const futureHistorySchema = `tenant_config_future_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
const prerequisiteMigrations = [
  [1784246400000, 'AddBoosterOnboardingFields1784246400000'],
  [1784332800000, 'AddBoosterDirectoryOrderSelection1784332800000'],
  [1784419200000, 'AddBoosterAvailability1784419200000'],
  [1784641800000, 'AddFeedbackDirectPenalty1784641800000'],
  [1784736000000, 'AddOrderRefundReview1784736000000'],
  [1784736100000, 'AddOrderRefundChannelAttempt1784736100000'],
  [1784736200000, 'AddOrderMemberSpendLedger1784736200000'],
  [1784736300000, 'RedactImPhoneSystemMessages1784736300000'],
  [1784908800000, 'AddProductPcPrices1784908800000'],
] as const;
const currentMigration = [1784995200000, 'AddTenantConfigOverrides1784995200000'] as const;
const tenantA = '00000000-0000-4000-8000-0000000000a2';
const tenantB = '00000000-0000-4000-8000-0000000000b2';
let dataSource: DataSource;

before(async () => {
  const env = loadEnvConfig();
  dataSource = await new DataSource({
    type: 'postgres',
    host: env.database.host,
    port: env.database.port,
    username: env.database.user,
    password: env.database.password,
    database: env.database.name,
  }).initialize();
  await dataSource.query(`CREATE SCHEMA "${schema}"`);
  await dataSource.query(`CREATE SCHEMA "${missingHistorySchema}"`);
  await dataSource.query(`CREATE SCHEMA "${incompleteHistorySchema}"`);
  await dataSource.query(`CREATE SCHEMA "${recordedMigrationSchema}"`);
  await dataSource.query(`CREATE SCHEMA "${duplicateHistorySchema}"`);
  await dataSource.query(`CREATE SCHEMA "${futureHistorySchema}"`);
});

after(async () => {
  if (!dataSource?.isInitialized) {
    return;
  }
  await dataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await dataSource.query(`DROP SCHEMA IF EXISTS "${missingHistorySchema}" CASCADE`);
  await dataSource.query(`DROP SCHEMA IF EXISTS "${incompleteHistorySchema}" CASCADE`);
  await dataSource.query(`DROP SCHEMA IF EXISTS "${recordedMigrationSchema}" CASCADE`);
  await dataSource.query(`DROP SCHEMA IF EXISTS "${duplicateHistorySchema}" CASCADE`);
  await dataSource.query(`DROP SCHEMA IF EXISTS "${futureHistorySchema}" CASCADE`);
  await dataSource.destroy();
});

test('生产 SQL 在本次 migration 已登记时拒绝重复执行', async () => {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await createLegacyTables(runner, recordedMigrationSchema);
    await seedLegacyData(runner, recordedMigrationSchema);
    await createMigrationHistory(runner, recordedMigrationSchema, [
      ...prerequisiteMigrations,
      currentMigration,
    ]);

    await assert.rejects(
      runner.query(await loadProductionScript(recordedMigrationSchema)),
      /current migration is already recorded/i,
    );
    await runner.query('ROLLBACK');

    const rows = (await runner.query(`SELECT to_regclass($1) AS "table_name"`, [
      `${recordedMigrationSchema}.sys_tenant_config_override`,
    ])) as Array<{ table_name: string | null }>;
    assert.equal(rows[0]?.table_name, null);
  } finally {
    await runner.query('ROLLBACK');
    await runner.release();
  }
});

test('生产 SQL 在任一前置 migration 记录缺失时拒绝执行', async () => {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await createLegacyTables(runner, incompleteHistorySchema);
    await seedLegacyData(runner, incompleteHistorySchema);
    await createMigrationHistory(
      runner,
      incompleteHistorySchema,
      prerequisiteMigrations.slice(0, -1),
    );

    await assert.rejects(
      runner.query(await loadProductionScript(incompleteHistorySchema)),
      /incomplete migration history.*AddProductPcPrices1784908800000/i,
    );
    await runner.query('ROLLBACK');

    const rows = (await runner.query(`SELECT to_regclass($1) AS "table_name"`, [
      `${incompleteHistorySchema}.sys_tenant_config_override`,
    ])) as Array<{ table_name: string | null }>;
    assert.equal(rows[0]?.table_name, null);
  } finally {
    await runner.query('ROLLBACK');
    await runner.release();
  }
});

test('生产 SQL 在 migration history 表缺失时建表前拒绝执行', async () => {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await createLegacyTables(runner, missingHistorySchema);
    await seedLegacyData(runner, missingHistorySchema);

    await assert.rejects(
      runner.query(await loadProductionScript(missingHistorySchema)),
      /missing required migration history table/i,
    );
    await runner.query('ROLLBACK');

    const rows = (await runner.query(`SELECT to_regclass($1) AS "table_name"`, [
      `${missingHistorySchema}.sys_tenant_config_override`,
    ])) as Array<{ table_name: string | null }>;
    assert.equal(rows[0]?.table_name, null);
  } finally {
    await runner.query('ROLLBACK');
    await runner.release();
  }
});

test('生产 SQL 在前置 history 包含重复或未来记录时拒绝执行', async () => {
  const cases: ReadonlyArray<{
    targetSchema: string;
    extraMigration: readonly [number, string];
  }> = [
    {
      targetSchema: duplicateHistorySchema,
      extraMigration: prerequisiteMigrations[0],
    },
    {
      targetSchema: futureHistorySchema,
      extraMigration: [1999999999999, 'FutureMigration1999999999999'],
    },
  ];

  for (const { targetSchema, extraMigration } of cases) {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    try {
      await createLegacyTables(runner, targetSchema);
      await seedLegacyData(runner, targetSchema);
      await createMigrationHistory(runner, targetSchema, [
        ...prerequisiteMigrations,
        extraMigration,
      ]);

      await assert.rejects(
        runner.query(await loadProductionScript(targetSchema)),
        /not the exact trusted prerequisite prefix/i,
      );
      await runner.query('ROLLBACK');

      const rows = (await runner.query(`SELECT to_regclass($1) AS "table_name"`, [
        `${targetSchema}.sys_tenant_config_override`,
      ])) as Array<{ table_name: string | null }>;
      assert.equal(rows[0]?.table_name, null);
    } finally {
      await runner.query('ROLLBACK');
      await runner.release();
    }
  }
});

test('生产 SQL 在事务内创建覆盖表、回填子租户并拒绝重复执行', async () => {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await createLegacyTables(runner);
    await seedLegacyData(runner);
    await createMigrationHistory(runner, schema, prerequisiteMigrations);

    const script = await loadProductionScript();
    await runner.query(script);

    const migrationRows: Array<{ timestamp: string; name: string }> = await runner.query(
      `SELECT "timestamp", "name"
       FROM "${schema}"."typeorm_migrations"
       WHERE "timestamp" = $1 OR "name" = $2`,
      [currentMigration[0], currentMigration[1]],
    );
    assert.deepEqual(migrationRows, [
      {
        timestamp: String(currentMigration[0]),
        name: currentMigration[1],
      },
    ]);

    const rows = (await runner.query(`
      SELECT "tenant_id", "key", "value"
      FROM "${schema}"."sys_tenant_config_override"
      ORDER BY "tenant_id", "key"
    `)) as Array<{ tenant_id: string; key: string; value: string }>;
    assert.equal(rows.length, 10);
    assert.equal(
      rows.some((row) => row.tenant_id === DEFAULT_TENANT_ID),
      false,
    );
    assert.equal(
      rows.some((row) => row.key === 'sms.provider'),
      false,
    );
    assert.equal(
      rows.find((row) => row.tenant_id === tenantA && row.key === 'system.appName')?.value,
      '升级前品牌',
    );

    const constraints = (await runner.query(
      `SELECT constraint_name
       FROM information_schema.table_constraints
       WHERE table_schema = $1
         AND table_name = 'sys_tenant_config_override'`,
      [schema],
    )) as Array<{ constraint_name: string }>;
    assert.equal(
      constraints.some(
        ({ constraint_name }) => constraint_name === 'UQ_sys_tenant_config_override_tenant_key',
      ),
      true,
    );
    assert.equal(
      constraints.some(
        ({ constraint_name }) => constraint_name === 'FK_sys_tenant_config_override_tenant',
      ),
      true,
    );
    assert.equal(
      constraints.some(
        ({ constraint_name }) => constraint_name === 'FK_sys_tenant_config_override_key',
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

    await assert.rejects(runner.query(script), /current migration is already recorded/i);
    await runner.query('ROLLBACK');
    assert.equal(
      Number(
        (
          (await runner.query(
            `SELECT COUNT(*) AS count FROM "${schema}"."sys_tenant_config_override"`,
          )) as Array<{ count: string }>
        )[0]?.count ?? '0',
      ),
      10,
    );
  } finally {
    await runner.query('ROLLBACK');
    await runner.release();
  }
});

async function loadProductionScript(targetSchema = schema): Promise<string> {
  const file = join(__dirname, '../src/database/sql/1784995200000-add-tenant-config-overrides.sql');
  const sql = await readFile(file, 'utf8');
  return sql
    .replace('\\set ON_ERROR_STOP on', '')
    .replaceAll('public.', `"${targetSchema}".`)
    .replaceAll("table_schema = 'public'", `table_schema = '${targetSchema}'`)
    .replaceAll("schemaname = 'public'", `schemaname = '${targetSchema}'`)
    .replaceAll(
      "hashtext('1784995200000-add-tenant-config-overrides')",
      `hashtext('1784995200000-add-tenant-config-overrides-${targetSchema}')`,
    );
}

async function createLegacyTables(runner: QueryRunner, targetSchema = schema): Promise<void> {
  await runner.query(`
    CREATE TABLE "${targetSchema}"."sys_tenant" (
      "id" uuid NOT NULL,
      "code" varchar(64) NOT NULL,
      CONSTRAINT "PK_sys_tenant" PRIMARY KEY ("id")
    )
  `);
  await runner.query(`
    CREATE TABLE "${targetSchema}"."sys_config" (
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
  await runner.query(`GRANT USAGE, CREATE ON SCHEMA "${targetSchema}" TO pg_database_owner`);
  await runner.query(`ALTER TABLE "${targetSchema}"."sys_config" OWNER TO pg_database_owner`);
  await runner.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON "${targetSchema}"."sys_config" TO PUBLIC`,
  );
}

async function createMigrationHistory(
  runner: QueryRunner,
  targetSchema: string,
  migrations: ReadonlyArray<readonly [number, string]>,
): Promise<void> {
  await runner.query(`
    CREATE TABLE "${targetSchema}"."typeorm_migrations" (
      "id" serial NOT NULL,
      "timestamp" bigint NOT NULL,
      "name" varchar NOT NULL,
      CONSTRAINT "PK_typeorm_migrations" PRIMARY KEY ("id")
    )
  `);
  for (const [timestamp, name] of migrations) {
    await runner.query(
      `INSERT INTO "${targetSchema}"."typeorm_migrations" ("timestamp", "name")
       VALUES ($1, $2)`,
      [timestamp, name],
    );
  }
}

async function assertPublicCrudPrivileges(runner: QueryRunner): Promise<void> {
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

async function seedLegacyData(runner: QueryRunner, targetSchema = schema): Promise<void> {
  await runner.query(
    `INSERT INTO "${targetSchema}"."sys_tenant" ("id", "code")
     VALUES ($1, 'default'), ($2, 'tenant-a'), ($3, 'tenant-b')`,
    [DEFAULT_TENANT_ID, tenantA, tenantB],
  );
  await runner.query(`
    INSERT INTO "${targetSchema}"."sys_config" ("key", "value")
    VALUES
      ('system.appName', '升级前品牌'),
      ('system.appLogo', '/logo.png'),
      ('portal.homeBanner', '{"items":[]}'),
      ('portal.showRank', 'true'),
      ('auth.userAgreement', '<p>协议</p>'),
      ('sms.provider', 'log')
  `);
}
