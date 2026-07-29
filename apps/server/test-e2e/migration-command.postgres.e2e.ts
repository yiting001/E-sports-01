import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { promisify } from 'node:util';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { runMigrationCommand } from '../src/database/migration-command';
import { adaptMigrationCommandDataSource } from '../src/database/migration-data-source';
import {
  SERVER_MIGRATION_DEFINITIONS,
  SERVER_MIGRATIONS,
} from '../src/database/migration-registry';

const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const missingHistorySchema = `migration_command_missing_${suffix}`;
const emptyHistorySchema = `migration_command_empty_${suffix}`;
const invalidHistorySchema = `migration_command_invalid_${suffix}`;
const concurrentSchema = `migration_command_concurrent_${suffix}`;
const rollbackSchema = `migration_command_rollback_${suffix}`;
const bundleSchema = `migration_command_bundle_${suffix}`;
const execFileAsync = promisify(execFile);
let connection: {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};
let adminDataSource: DataSource;
let bundleDirectory: string;
let isolatedBundlePath: string;

before(async () => {
  const env = loadEnvConfig();
  connection = {
    type: 'postgres',
    host: env.database.host,
    port: env.database.port,
    username: env.database.user,
    password: env.database.password,
    database: env.database.name,
  };
  adminDataSource = await new DataSource(connection).initialize();
  await adminDataSource.query(`CREATE SCHEMA "${missingHistorySchema}"`);
  await adminDataSource.query(`CREATE SCHEMA "${emptyHistorySchema}"`);
  await adminDataSource.query(`CREATE SCHEMA "${invalidHistorySchema}"`);
  await adminDataSource.query(`CREATE SCHEMA "${concurrentSchema}"`);
  await adminDataSource.query(`CREATE SCHEMA "${rollbackSchema}"`);
  await adminDataSource.query(`CREATE SCHEMA "${bundleSchema}"`);
  bundleDirectory = await mkdtemp(join(tmpdir(), 'e-sports-migration-bundle-'));
  isolatedBundlePath = join(bundleDirectory, 'main.js');
  await copyFile(join(__dirname, '../bundle/main.js'), isolatedBundlePath);
});

after(async () => {
  if (!adminDataSource?.isInitialized) {
    return;
  }
  await adminDataSource.query(`DROP SCHEMA IF EXISTS "${missingHistorySchema}" CASCADE`);
  await adminDataSource.query(`DROP SCHEMA IF EXISTS "${emptyHistorySchema}" CASCADE`);
  await adminDataSource.query(`DROP SCHEMA IF EXISTS "${invalidHistorySchema}" CASCADE`);
  await adminDataSource.query(`DROP SCHEMA IF EXISTS "${concurrentSchema}" CASCADE`);
  await adminDataSource.query(`DROP SCHEMA IF EXISTS "${rollbackSchema}" CASCADE`);
  await adminDataSource.query(`DROP SCHEMA IF EXISTS "${bundleSchema}" CASCADE`);
  await adminDataSource.destroy();
  if (bundleDirectory) {
    await rm(bundleDirectory, { recursive: true, force: true });
  }
});

test('隔离目录中的单文件 audit 使用只读事务且不创建 history', async () => {
  const { stdout } = await runBundleCommand(missingHistorySchema, 'migration:audit');
  const report = JSON.parse(stdout) as {
    guardrails: { transactionReadOnly: boolean; isolation: string };
    history: { state: string; records: unknown[] };
    checks: unknown[];
    summary: { manualBaselineRequired: boolean };
  };

  assert.deepEqual(report.guardrails, {
    transactionReadOnly: true,
    isolation: 'repeatable read',
  });
  assert.equal(report.history.state, 'missing');
  assert.deepEqual(report.history.records, []);
  assert.equal(report.checks.length, SERVER_MIGRATION_DEFINITIONS.length + 3);
  assert.equal(report.summary.manualBaselineRequired, true);

  const rows = (await adminDataSource.query(`SELECT to_regclass($1)::text AS "tableName"`, [
    `${missingHistorySchema}.typeorm_migrations`,
  ])) as Array<{ tableName: string | null }>;
  assert.equal(rows[0]?.tableName, null);
});

test('单文件 show 在 history 缺失时不隐式创建表', async () => {
  await assert.rejects(
    runMigrationCommand('migration:show', {
      createDataSource: () => createCommandDataSource(missingHistorySchema),
      write: () => undefined,
    }),
    /typeorm_migrations.*migration:audit.*baseline review/i,
  );

  const rows = (await adminDataSource.query(`SELECT to_regclass($1)::text AS "tableName"`, [
    `${missingHistorySchema}.typeorm_migrations`,
  ])) as Array<{ tableName: string | null }>;
  assert.equal(rows[0]?.tableName, null);
});

test('单文件 audit 标记空 history，show 拒绝执行全部历史 migration', async () => {
  await createMigrationHistoryTable(emptyHistorySchema);

  const { stdout } = await runBundleCommand(emptyHistorySchema, 'migration:audit');
  const report = JSON.parse(stdout) as {
    history: { state: string; records: unknown[] };
    summary: { manualBaselineRequired: boolean };
  };
  assert.equal(report.history.state, 'empty');
  assert.deepEqual(report.history.records, []);
  assert.equal(report.summary.manualBaselineRequired, true);

  await assert.rejects(
    runMigrationCommand('migration:show', {
      createDataSource: () => createCommandDataSource(emptyHistorySchema),
      write: () => undefined,
    }),
    /typeorm_migrations.*empty.*migration:audit.*baseline review/i,
  );
});

test('单文件 audit 将重复 history 标记为无效并要求人工处理', async () => {
  await createMigrationHistoryTable(invalidHistorySchema);
  const firstMigration = SERVER_MIGRATION_DEFINITIONS[0];
  assert.ok(firstMigration);
  await adminDataSource.query(
    `INSERT INTO "${invalidHistorySchema}"."typeorm_migrations" ("timestamp", "name")
     VALUES ($1, $2), ($1, $2)`,
    [firstMigration.timestamp, firstMigration.name],
  );

  const { stdout } = await runBundleCommand(invalidHistorySchema, 'migration:audit');
  const report = JSON.parse(stdout) as {
    history: { state: string; validationError: string | null };
    summary: { manualBaselineRequired: boolean };
  };
  assert.equal(report.history.state, 'invalid');
  assert.match(report.history.validationError ?? '', /duplicate entry/i);
  assert.equal(report.summary.manualBaselineRequired, true);
});

test('两个 migration runner 并发串行化，首次执行一次且后续幂等', { timeout: 90_000 }, async () => {
  await createTrustedBaseline(concurrentSchema, true);
  const outputs: [string[], string[]] = [[], []];

  await Promise.all(
    outputs.map(async (output) => {
      await runMigrationCommand('migration:run', {
        createDataSource: () => createCommandDataSource(concurrentSchema),
        write: (message) => output.push(message),
      });
    }),
  );

  const currentMigration = latestMigration();
  const history = (await adminDataSource.query(
    `SELECT "timestamp"::text AS "timestamp", "name"
       FROM "${concurrentSchema}"."typeorm_migrations"
       WHERE "timestamp" = $1 OR "name" = $2`,
    [currentMigration.timestamp, currentMigration.name],
  )) as Array<{ timestamp: string; name: string }>;
  assert.deepEqual(history, [
    {
      timestamp: String(currentMigration.timestamp),
      name: currentMigration.name,
    },
  ]);

  const tableRows = (await adminDataSource.query(`SELECT to_regclass($1)::text AS "tableName"`, [
    `${concurrentSchema}.sys_tenant_config_override`,
  ])) as Array<{ tableName: string | null }>;
  assert.equal(tableRows[0]?.tableName, `${concurrentSchema}.sys_tenant_config_override`);
  await assertNoticePopupColumn(concurrentSchema);
  assert.equal(
    outputs.filter((output) => output.join('').includes(`executed ${currentMigration.name}`))
      .length,
    1,
  );
  assert.equal(
    outputs.filter((output) => output.join('').includes('no pending migrations')).length,
    1,
  );

  const repeatOutput: string[] = [];
  await runMigrationCommand('migration:run', {
    createDataSource: () => createCommandDataSource(concurrentSchema),
    write: (message) => repeatOutput.push(message),
  });
  assert.match(repeatOutput.join(''), /no pending migrations/i);
});

test('migration 失败时业务 DDL 与 history 记录整体回滚', async () => {
  await createTrustedBaseline(rollbackSchema, false);

  await assert.rejects(
    runMigrationCommand('migration:run', {
      createDataSource: () => createCommandDataSource(rollbackSchema),
      write: () => undefined,
    }),
    /sys_config/i,
  );

  const currentMigration = latestMigration();
  const rows = (await adminDataSource.query(
    `SELECT
       to_regclass($1)::text AS "tableName",
       (
         SELECT COUNT(*)::integer
         FROM "${rollbackSchema}"."typeorm_migrations"
         WHERE "timestamp" = $2 OR "name" = $3
       ) AS "historyCount"`,
    [
      `${rollbackSchema}.sys_tenant_config_override`,
      currentMigration.timestamp,
      currentMigration.name,
    ],
  )) as Array<{ tableName: string | null; historyCount: number }>;
  assert.equal(rows[0]?.tableName, null);
  assert.equal(rows[0]?.historyCount, 0);
});

test('隔离目录中的真实 bundle 可完成 show、run 与重复幂等执行', { timeout: 90_000 }, async () => {
  await createTrustedBaseline(bundleSchema, true);

  const showResult = await runBundleCommand(bundleSchema, 'migration:show');
  assert.match(showResult.stdout, /\[ \].*AddTenantConfigOverrides1784995200000/);
  assert.match(showResult.stdout, /\[ \].*AddNoticePopup1785500000000/);
  assert.match(showResult.stdout, /2 pending migration\(s\)/i);

  const runResult = await runBundleCommand(bundleSchema, 'migration:run');
  assert.match(runResult.stdout, /executed AddTenantConfigOverrides1784995200000/);
  assert.match(runResult.stdout, /executed AddNoticePopup1785500000000/);

  const currentMigration = latestMigration();
  const rows = (await adminDataSource.query(
    `SELECT
         to_regclass($1)::text AS "tableName",
         (
           SELECT COUNT(*)::integer
           FROM "${bundleSchema}"."typeorm_migrations"
           WHERE "timestamp" = $2 AND "name" = $3
         ) AS "historyCount"`,
    [
      `${bundleSchema}.sys_tenant_config_override`,
      currentMigration.timestamp,
      currentMigration.name,
    ],
  )) as Array<{ tableName: string | null; historyCount: number }>;
  assert.equal(rows[0]?.tableName, `${bundleSchema}.sys_tenant_config_override`);
  assert.equal(rows[0]?.historyCount, 1);
  await assertNoticePopupColumn(bundleSchema);

  const repeatResult = await runBundleCommand(bundleSchema, 'migration:run');
  assert.match(repeatResult.stdout, /no pending migrations/i);
});

function createCommandDataSource(schema: string) {
  return adaptMigrationCommandDataSource(
    new DataSource({
      ...connection,
      schema,
      extra: { options: `-c search_path=${schema}`, max: 1 },
      entities: [],
      migrations: SERVER_MIGRATIONS,
      migrationsTableName: 'typeorm_migrations',
      migrationsTransactionMode: 'all',
      synchronize: false,
    }),
  );
}

async function runBundleCommand(
  schema: string,
  command: 'migration:audit' | 'migration:show' | 'migration:run',
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(process.execPath, [isolatedBundlePath, command], {
    cwd: bundleDirectory,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: '0',
      DB_HOST: connection.host,
      DB_PORT: String(connection.port),
      DB_USER: connection.username,
      DB_PASSWORD: connection.password,
      DB_NAME: connection.database,
      DB_SYNCHRONIZE: 'false',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '6379',
      JWT_SECRET: 'bundle-e2e-access',
      JWT_REFRESH_SECRET: 'bundle-e2e-refresh',
      PGOPTIONS: `-c search_path=${schema}`,
      NODE_OPTIONS: '',
      FORCE_COLOR: '0',
    },
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
  return { stdout: result.stdout, stderr: result.stderr };
}

async function createTrustedBaseline(schema: string, includeConfig: boolean): Promise<void> {
  await adminDataSource.query(`
    CREATE TABLE "${schema}"."sys_tenant" (
      "id" uuid NOT NULL,
      "code" varchar(64) NOT NULL,
      CONSTRAINT "PK_${schema}_tenant" PRIMARY KEY ("id")
    )
  `);
  if (includeConfig) {
    await adminDataSource.query(`
      CREATE TABLE "${schema}"."sys_config" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "key" varchar(128) NOT NULL,
        "value" text NOT NULL,
        CONSTRAINT "PK_${schema}_config" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_${schema}_config_key" UNIQUE ("key")
      )
    `);
  }
  await adminDataSource.query(`
    CREATE TABLE "${schema}"."notice" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      CONSTRAINT "PK_${schema}_notice" PRIMARY KEY ("id")
    )
  `);
  await createMigrationHistoryTable(schema);

  for (const migration of SERVER_MIGRATION_DEFINITIONS.slice(0, -2)) {
    await adminDataSource.query(
      `INSERT INTO "${schema}"."typeorm_migrations" ("timestamp", "name")
       VALUES ($1, $2)`,
      [migration.timestamp, migration.name],
    );
  }
  if (!includeConfig) {
    return;
  }
  await adminDataSource.query(
    `INSERT INTO "${schema}"."sys_tenant" ("id", "code")
     VALUES
       ('00000000-0000-0000-0000-000000000001', 'default'),
       ('00000000-0000-4000-8000-0000000000e2', 'tenant-e2e')`,
  );
  await adminDataSource.query(
    `INSERT INTO "${schema}"."sys_config" ("key", "value")
     VALUES
       ('system.appName', '命令迁移测试'),
       ('system.appLogo', '/logo.png'),
       ('portal.homeBanner', '[]'),
       ('portal.showRank', 'true'),
       ('auth.userAgreement', '测试协议')`,
  );
}

async function assertNoticePopupColumn(schema: string): Promise<void> {
  const rows = (await adminDataSource.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'notice' AND column_name = 'popup'
     ) AS "present"`,
    [schema],
  )) as Array<{ present: boolean }>;
  assert.equal(rows[0]?.present, true);
}

async function createMigrationHistoryTable(schema: string): Promise<void> {
  await adminDataSource.query(`
    CREATE TABLE "${schema}"."typeorm_migrations" (
      "id" SERIAL NOT NULL,
      "timestamp" bigint NOT NULL,
      "name" varchar NOT NULL,
      CONSTRAINT "PK_${schema}_migrations" PRIMARY KEY ("id")
    )
  `);
}

function latestMigration() {
  const migration = SERVER_MIGRATION_DEFINITIONS[SERVER_MIGRATION_DEFINITIONS.length - 1];
  assert.ok(migration);
  return migration;
}
