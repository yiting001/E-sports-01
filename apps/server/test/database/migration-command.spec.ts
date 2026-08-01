import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import {
  MigrationCommandDataSource,
  MigrationCommandQueryRunner,
  resolveServerCommand,
  runMigrationCommand,
} from '../../src/database/migration-command';
import { acquireTransactionMigrationLock } from '../../src/database/migration-lock';
import {
  SERVER_MIGRATION_DEFINITIONS,
  SERVER_MIGRATIONS,
} from '../../src/database/migration-registry';

test('单文件入口只接受启动、迁移和帮助命令', () => {
  assert.equal(resolveServerCommand([]), 'start');
  assert.equal(resolveServerCommand(['start']), 'start');
  assert.equal(resolveServerCommand(['migration:audit']), 'migration:audit');
  assert.equal(resolveServerCommand(['migration:show']), 'migration:show');
  assert.equal(resolveServerCommand(['migration:run']), 'migration:run');
  assert.equal(resolveServerCommand(['help']), 'help');
  assert.equal(resolveServerCommand(['--help']), 'help');
  assert.throws(() => resolveServerCommand(['migration:revert']), /Unsupported server command/);
  assert.throws(
    () => resolveServerCommand(['migration:run', '--fake']),
    /Unsupported server command/,
  );
});

test('静态 migration 清单覆盖目录内全部迁移且时间戳顺序唯一', async () => {
  const migrationFiles = (await readdir(join(__dirname, '../../src/database/migrations')))
    .filter((file) => /^\d{13}-.+\.ts$/.test(file))
    .sort();
  const fileTimestamps = migrationFiles.map((file) => file.slice(0, 13));
  const registeredTimestamps = SERVER_MIGRATIONS.map((MigrationClass) => {
    const migration = new MigrationClass();
    const timestamp = /(\d{13})$/.exec(migration.name ?? '')?.[1];
    assert.ok(timestamp, `migration 名称缺少 13 位时间戳：${migration.name ?? '<empty>'}`);
    return timestamp;
  });

  assert.deepEqual(registeredTimestamps, [...registeredTimestamps].sort());
  assert.equal(new Set(registeredTimestamps).size, registeredTimestamps.length);
  assert.deepEqual(registeredTimestamps, fileTimestamps);
});

test('history 表缺失时 fail-closed，且 show 不创建迁移表', async () => {
  const dataSource = new FakeMigrationDataSource(null);

  await assert.rejects(
    runMigrationCommand('migration:show', {
      createDataSource: () => dataSource,
      write: () => undefined,
    }),
    /typeorm_migrations.*migration:audit.*baseline review/i,
  );

  assert.equal(dataSource.runCalls, 0);
  assert.equal(dataSource.destroyCalls, 1);
});

test('空 history 表不构成可信基线且不得执行历史 migration', async () => {
  const dataSource = new FakeMigrationDataSource('typeorm_migrations');

  await assert.rejects(
    runMigrationCommand('migration:run', {
      createDataSource: () => dataSource,
      write: () => undefined,
    }),
    /typeorm_migrations.*empty.*migration:audit.*baseline review/i,
  );

  assert.equal(dataSource.runCalls, 0);
  assert.equal(dataSource.lockCalls, 1);
  assert.equal(dataSource.unlockCalls, 1);
  assert.equal(dataSource.releaseCalls, 1);
  assert.equal(dataSource.destroyCalls, 1);
});

test('migration:show 返回待执行状态并始终关闭连接', async () => {
  const dataSource = new FakeMigrationDataSource('typeorm_migrations');
  dataSource.history = migrationHistory().slice(0, -2);
  const output: string[] = [];

  await runMigrationCommand('migration:show', {
    createDataSource: () => dataSource,
    write: (message) => output.push(message),
  });

  assert.equal(dataSource.runCalls, 0);
  assert.equal(dataSource.destroyCalls, 1);
  assert.match(output.join(''), /\[ \].*AddThemeEffectSetting1785800000000/);
  assert.match(output.join(''), /\[ \].*AddNotifyWechatBinding1785900000000/);
  assert.match(output.join(''), /2 pending migration/i);
});

test('migration:run 以单事务执行并输出实际完成的迁移', async () => {
  const dataSource = new FakeMigrationDataSource('typeorm_migrations');
  dataSource.history = migrationHistory().slice(0, -2);
  dataSource.executedMigrations = [
    { name: 'AddThemeEffectSetting1785800000000' },
    { name: 'AddNotifyWechatBinding1785900000000' },
  ];
  const output: string[] = [];

  await runMigrationCommand('migration:run', {
    createDataSource: () => dataSource,
    write: (message) => output.push(message),
  });

  assert.equal(dataSource.runCalls, 1);
  assert.equal(dataSource.transactionMode, 'all');
  assert.equal(dataSource.lockCalls, 1);
  assert.equal(dataSource.unlockCalls, 1);
  assert.equal(dataSource.releaseCalls, 1);
  assert.equal(dataSource.destroyCalls, 1);
  assert.match(output.join(''), /AddThemeEffectSetting1785800000000/);
  assert.match(output.join(''), /AddNotifyWechatBinding1785900000000/);
});

test('migration 执行失败时保留原始错误并关闭连接', async () => {
  const dataSource = new FakeMigrationDataSource('typeorm_migrations');
  dataSource.history = migrationHistory().slice(0, -1);
  dataSource.runError = new Error('migration failed');
  dataSource.unlockError = new Error('unlock failed');
  dataSource.destroyError = new Error('destroy failed');

  await assert.rejects(
    runMigrationCommand('migration:run', {
      createDataSource: () => dataSource,
      write: () => undefined,
    }),
    /migration failed/,
  );
  assert.equal(dataSource.unlockCalls, 1);
  assert.equal(dataSource.releaseCalls, 1);
  assert.equal(dataSource.destroyCalls, 1);
});

test('数据库主动取消 migration 锁查询时保留原始错误且不执行 DDL', async () => {
  const dataSource = new FakeMigrationDataSource('typeorm_migrations');
  dataSource.history = migrationHistory().slice(0, -1);
  dataSource.lockError = Object.assign(new Error('canceling statement due to statement timeout'), {
    code: '57014',
  });

  await assert.rejects(
    runMigrationCommand('migration:run', {
      createDataSource: () => dataSource,
      write: () => undefined,
    }),
    /canceling statement due to statement timeout/,
  );

  assert.equal(dataSource.runCalls, 0);
  assert.equal(dataSource.unlockCalls, 0);
  assert.equal(dataSource.releaseCalls, 1);
  assert.equal(dataSource.destroyCalls, 1);
});

test('事务级 migration 锁达到等待上限后失败且不修改会话超时', async () => {
  let queryCalls = 0;
  await assert.rejects(
    acquireTransactionMigrationLock(
      {
        query: async () => {
          queryCalls += 1;
          return [{ acquired: false }];
        },
      },
      'test-migration-lock',
      { timeoutMs: 0, pollIntervalMs: 0 },
    ),
    /Timed out after 0 seconds waiting for the migration lock/,
  );
  assert.equal(queryCalls, 1);
});

test('history 时间戳与名称不匹配或出现断档时在 DDL 前拒绝', async () => {
  const mismatch = new FakeMigrationDataSource('typeorm_migrations');
  mismatch.history = [
    {
      timestamp: String(SERVER_MIGRATION_DEFINITIONS[0]?.timestamp),
      name: 'WrongMigration1784246400000',
    },
  ];
  await assert.rejects(
    runMigrationCommand('migration:run', {
      createDataSource: () => mismatch,
      write: () => undefined,
    }),
    /not a continuous trusted prefix/i,
  );
  assert.equal(mismatch.runCalls, 0);

  const gap = new FakeMigrationDataSource('typeorm_migrations');
  gap.history = [migrationHistory()[1]];
  await assert.rejects(
    runMigrationCommand('migration:run', {
      createDataSource: () => gap,
      write: () => undefined,
    }),
    /not a continuous trusted prefix/i,
  );
  assert.equal(gap.runCalls, 0);
});

test('history 重复或数据库版本高于 bundle 时拒绝执行', async () => {
  const duplicate = new FakeMigrationDataSource('typeorm_migrations');
  const firstMigration = migrationHistory()[0];
  duplicate.history = [firstMigration, firstMigration];
  await assert.rejects(
    runMigrationCommand('migration:run', {
      createDataSource: () => duplicate,
      write: () => undefined,
    }),
    /duplicate entry/i,
  );
  assert.equal(duplicate.runCalls, 0);

  const newer = new FakeMigrationDataSource('typeorm_migrations');
  newer.history = [
    ...migrationHistory(),
    { timestamp: '1999999999999', name: 'FutureMigration1999999999999' },
  ];
  await assert.rejects(
    runMigrationCommand('migration:run', {
      createDataSource: () => newer,
      write: () => undefined,
    }),
    /newer than this server bundle/i,
  );
  assert.equal(newer.runCalls, 0);
});

class FakeMigrationDataSource implements MigrationCommandDataSource {
  isInitialized = false;
  runCalls = 0;
  destroyCalls = 0;
  lockCalls = 0;
  unlockCalls = 0;
  releaseCalls = 0;
  history: Array<{ timestamp: string; name: string }> = [];
  executedMigrations: Array<{ name: string }> = [];
  runError?: Error;
  lockError?: Error & { code: string };
  unlockError?: Error;
  destroyError?: Error;
  transactionMode?: 'all' | 'none' | 'each';

  constructor(private readonly historyTable: string | null) {}

  async initialize(): Promise<this> {
    this.isInitialized = true;
    return this;
  }

  async query(sql: string): Promise<unknown> {
    if (sql.includes('to_regclass')) {
      return [{ historyTable: this.historyTable }];
    }
    if (sql.includes('FROM "typeorm_migrations"')) {
      return this.history;
    }
    if (sql.includes('pg_try_advisory_lock')) {
      this.lockCalls += 1;
      if (this.lockError) {
        throw this.lockError;
      }
      return [{ acquired: true }];
    }
    if (sql.includes('pg_advisory_unlock')) {
      this.unlockCalls += 1;
      if (this.unlockError) {
        throw this.unlockError;
      }
      return [{ released: true }];
    }
    throw new Error(`Unexpected test query: ${sql}`);
  }

  createQueryRunner(): MigrationCommandQueryRunner {
    return this;
  }

  async connect(): Promise<void> {
    return undefined;
  }

  async startTransaction(): Promise<void> {
    return undefined;
  }

  async rollbackTransaction(): Promise<void> {
    return undefined;
  }

  async executePendingMigrations(
    queryRunner: MigrationCommandQueryRunner,
    transaction: 'all' | 'none' | 'each',
  ): Promise<Array<{ name: string }>> {
    assert.equal(queryRunner, this);
    this.runCalls += 1;
    this.transactionMode = transaction;
    if (this.runError) {
      throw this.runError;
    }
    this.history = migrationHistory();
    return this.executedMigrations;
  }

  async release(): Promise<void> {
    this.releaseCalls += 1;
  }

  async destroy(): Promise<void> {
    this.destroyCalls += 1;
    this.isInitialized = false;
    if (this.destroyError) {
      throw this.destroyError;
    }
  }
}

function migrationHistory(): Array<{ timestamp: string; name: string }> {
  return SERVER_MIGRATION_DEFINITIONS.map(({ timestamp, name }) => ({
    timestamp: String(timestamp),
    name,
  }));
}
